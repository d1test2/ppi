const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'client' folder
app.use(express.static(path.join(__dirname, '../client')));

// 1. Single postcode search endpoint
app.get('/api/outward-postcode/:code', async (req, res) => {
    const rawCode = req.params.code;
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    
    console.log(`🔍 Search Request: [${rawCode}] -> Normalized: [${code}]`);

    try {
        const result = await db.query(
            'SELECT * FROM outward_postcode_summary WHERE outward_postcode = $1',
            [code]
        );
        
        console.log(`📊 DB Results for ${code}: ${result.rows.length} rows found`);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Postcode district not found' });
        }
        
        // Fetch latest metadata
        const meta = await db.query('SELECT * FROM metadata ORDER BY last_updated DESC LIMIT 1');
        
        res.json({
            ...result.rows[0],
            source: meta.rows[0] || { nspl_version: 'Unknown', ts044_version: 'Unknown', last_updated: null }
        });
    } catch (err) {
        console.error('❌ Database Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Comparison endpoint
app.post('/api/outward-postcode/compare', async (req, res) => {
    const { districts } = req.body;
    if (!Array.isArray(districts) || districts.length === 0) {
        return res.status(400).json({ error: 'Invalid districts list' });
    }
    
    const normalized = districts.map(d => d.trim().toUpperCase().replace(/\s+/g, ''));
    
    try {
        const result = await db.query(
            'SELECT * FROM outward_postcode_summary WHERE outward_postcode = ANY($1)',
            [normalized]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Metadata endpoint
app.get('/api/metadata', async (req, res) => {
    try {
        const meta = await db.query('SELECT * FROM metadata ORDER BY last_updated DESC LIMIT 1');
        res.json(meta.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Default to index.html for unknown routes (for React)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is live!`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://0.0.0.0:${PORT}`);
});
