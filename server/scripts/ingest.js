const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse'); // Using streaming version
const db = require('../db');

// ONS Data URLs
const TS044_URL = 'https://www.nomisweb.co.uk/output/census/2021/census2021-ts044.zip';
const NSPL_URL = 'https://www.arcgis.com/sharing/rest/content/items/36b718ad00de49afb9ad364f8b815b9e/data';

async function downloadFile(url, dest) {
    console.log(`Downloading ${url}...`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://geoportal.statistics.gov.uk/'
        }
    });

    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function runETL() {
    const tempDir = path.join(__dirname, '../temp_data');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const ts044Zip = path.join(tempDir, 'ts044.zip');
    const nsplZip = path.join(tempDir, 'nspl.zip');

    try {
        await downloadFile(TS044_URL, ts044Zip);
        await downloadFile(NSPL_URL, nsplZip);

        console.log('Extracting datasets...');
        new AdmZip(ts044Zip).extractAllTo(path.join(tempDir, 'ts044'), true);
        new AdmZip(nsplZip).extractAllTo(path.join(tempDir, 'nspl'), true);

        // 1. Process TS044 (Accommodation Type counts by OA)
        console.log('Processing TS044...');
        const ts044Data = {};
        const ts044File = path.join(tempDir, 'ts044', 'census2021-ts044-oa.csv');
        
        const ts044Parser = fs.createReadStream(ts044File).pipe(parse({ columns: true, skip_empty_lines: true }));
        for await (const row of ts044Parser) {
            // Smart column detection
            const oa = row['geography code'] || row['Output Areas Code'] || row['GEOGRAPHY_CODE'];
            
            // Find the label/type column dynamically
            const typeKey = Object.keys(row).find(k => k.toLowerCase().includes('type') || k.toLowerCase().includes('label'));
            const countKey = Object.keys(row).find(k => k.toLowerCase().includes('observation') || k.toLowerCase().includes('value'));
            
            const type = row[typeKey] || '';
            const count = parseInt(row[countKey] || 0, 10);

            if (!oa) continue;
            if (!ts044Data[oa]) ts044Data[oa] = { detached: 0, semi: 0, terraced: 0, flat: 0, caravan: 0 };
            
            if (type.includes('Detached')) ts044Data[oa].detached = count;
            else if (type.includes('Semi-detached')) ts044Data[oa].semi = count;
            else if (type.includes('Terraced')) ts044Data[oa].terraced = count;
            else if (type.includes('Flat') || type.includes('apartment')) ts044Data[oa].flat += count;
            else if (type.includes('caravan') || type.includes('temporary')) ts044Data[oa].caravan = count;
        }

        // 2. Process NSPL (Map OA to Outward Postcode)
        console.log('Processing NSPL and aggregating...');
        const nsplDir = path.join(tempDir, 'nspl/Data');
        const nsplFiles = fs.readdirSync(nsplDir);
        const nsplFileName = nsplFiles.find(f => f.toLowerCase().endsWith('.csv') && f.toLowerCase().includes('uk'));
        
        if (!nsplFileName) throw new Error('Could not find NSPL CSV file in Data folder');

        const summary = {};
        const nsplParser = fs.createReadStream(path.join(nsplDir, nsplFileName)).pipe(parse({ columns: true, skip_empty_lines: true }));

        for await (const row of nsplParser) {
            const postcode = row.pcd7 || row.pcd || row.postcode;
            const oa = row.oa21cd || row.oa11cd;
            if (!postcode || !oa || !ts044Data[oa]) continue;

            const outward = postcode.slice(0, -3).trim().toUpperCase();
            if (!summary[outward]) {
                summary[outward] = { detached: 0, semi: 0, terraced: 0, flat: 0, caravan: 0, total_stock: 0 };
            }

            const stock = ts044Data[oa];
            summary[outward].detached += stock.detached;
            summary[outward].semi += stock.semi;
            summary[outward].terraced += stock.terraced;
            summary[outward].flat += stock.flat;
            summary[outward].caravan += stock.caravan;
        }

        // 3. Save to Database
        console.log('Saving to database...');
        await db.query('BEGIN');
        await db.query('DELETE FROM outward_postcode_summary');

        const insertQuery = `
            INSERT INTO outward_postcode_summary 
            (outward_postcode, detached, semi, terraced, flat, caravan, total_stock, source_version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        for (const [outward, data] of Object.entries(summary)) {
            const total = data.detached + data.semi + data.terraced + data.flat + data.caravan;
            if (total === 0) continue;
            
            await db.query(insertQuery, [
                outward, data.detached, data.semi, data.terraced, data.flat, data.caravan, total, 'ONS Feb 2026'
            ]);
        }

        await db.query('COMMIT');
        console.log('ETL completed successfully!');

    } catch (err) {
        await db.query('ROLLBACK');
        console.log('ETL failed:', err);
    } finally {
        // Clean up temp files
        // fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

runETL();
