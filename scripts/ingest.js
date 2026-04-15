const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse/sync');
const db = require('../server/db');

// ONS Data URLs
const TS044_URL = 'https://www.nomisweb.co.uk/output/census/2021/census2021-ts044.zip';
const NSPL_URL = 'https://www.arcgis.com/sharing/rest/content/items/5973da999af142c6a0860888081f2112/data'; // NSPL August 2025 item id

async function downloadFile(url, dest) {
    console.log(`Downloading ${url}...`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
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

    try {
        // 1. Download Datasets
        await downloadFile(TS044_URL, path.join(tempDir, 'ts044.zip'));
        await downloadFile(NSPL_URL, path.join(tempDir, 'nspl.zip'));

        console.log('Extracting datasets...');
        const ts044Zip = new AdmZip(path.join(tempDir, 'ts044.zip'));
        ts044Zip.extractAllTo(path.join(tempDir, 'ts044'), true);

        const nsplZip = new AdmZip(path.join(tempDir, 'nspl.zip'));
        nsplZip.extractAllTo(path.join(tempDir, 'nspl'), true);

        // 2. Process TS044 (Accommodation Type by Output Area)
        console.log('Processing TS044...');
        const ts044CsvPath = path.join(tempDir, 'ts044/census2021-ts044-oa.csv');
        const ts044Content = fs.readFileSync(ts044CsvPath, 'utf8');
        const ts044Records = parse(ts044Content, { columns: true, skip_empty_lines: true });

        const oaData = {};
        ts044Records.forEach(row => {
            const oaCode = row['Output Areas Code'] || row['geography code'];
            oaData[oaCode] = {
                detached: parseInt(row['Whole house or bungalow: Detached'] || 0),
                semi: parseInt(row['Whole house or bungalow: Semi-detached'] || 0),
                terraced: parseInt(row['Whole house or bungalow: Terraced (including end-terrace)'] || 0),
                flat: parseInt(row['Flat, maisonette or apartment'] || 0),
                caravan: parseInt(row['A caravan or other mobile or temporary structure'] || 0)
            };
        });

        // 3. Process NSPL (Postcode to OA)
        console.log('Processing NSPL and aggregating...');
        const nsplCsvPath = path.join(tempDir, 'nspl/Data/NSPL_AUG_2025_UK.csv');
        const nsplContent = fs.readFileSync(nsplCsvPath, 'utf8');
        const nsplRecords = parse(nsplContent, { columns: true, skip_empty_lines: true });

        const summary = {};
        nsplRecords.forEach(row => {
            const fullPostcode = row.pcd || row.pcd7;
            if (!fullPostcode) return;

            const outwardPostcode = fullPostcode.trim().replace(/\s+/g, '').slice(0, -3).toUpperCase();
            const oaCode = row.oa21 || row.oa21cd;

            if (!summary[outwardPostcode]) {
                summary[outwardPostcode] = { detached: 0, semi: 0, terraced: 0, flat: 0, caravan: 0, total_stock: 0 };
            }

            const data = oaData[oaCode];
            if (data) {
                summary[outwardPostcode].detached += data.detached;
                summary[outwardPostcode].semi += data.semi;
                summary[outwardPostcode].terraced += data.terraced;
                summary[outwardPostcode].flat += data.flat;
                summary[outwardPostcode].caravan += data.caravan;
            }
        });

        // 4. Update Database
        console.log('Updating database...');
        for (const [code, stock] of Object.entries(summary)) {
            const total = stock.detached + stock.semi + stock.terraced + stock.flat + stock.caravan;
            await db.query(`
                INSERT INTO outward_postcode_summary 
                (outward_postcode, detached, semi, terraced, flat, caravan, total_stock)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (outward_postcode) DO UPDATE SET
                detached = $2, semi = $3, terraced = $4, flat = $5, caravan = $6, total_stock = $7,
                updated_at = CURRENT_TIMESTAMP
            `, [code, stock.detached, stock.semi, stock.terraced, stock.flat, total]);
        }

        await db.query(`
            INSERT INTO metadata (nspl_version, ts044_version)
            VALUES ($1, $2)
        `, ['August 2025', 'Census 2021']);

        console.log('ETL completed successfully.');
    } catch (err) {
        console.error('ETL failed:', err);
    } finally {
        // Cleanup temp files if needed
        // fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

runETL();
