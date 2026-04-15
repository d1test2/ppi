-- Schema for Postcode Housing Stock App

-- 1. Metadata table to track source versions
CREATE TABLE IF NOT EXISTS metadata (
    id SERIAL PRIMARY KEY,
    nspl_version TEXT,
    ts044_version TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Main summary table for fast lookups
CREATE TABLE IF NOT EXISTS outward_postcode_summary (
    outward_postcode VARCHAR(10) PRIMARY KEY,
    detached INTEGER DEFAULT 0,
    semi INTEGER DEFAULT 0,
    terraced INTEGER DEFAULT 0,
    flat INTEGER DEFAULT 0,
    caravan INTEGER DEFAULT 0,
    total_stock INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast searches
CREATE INDEX IF NOT EXISTS idx_outward_postcode ON outward_postcode_summary (outward_postcode);
