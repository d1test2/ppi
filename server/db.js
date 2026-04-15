const { Pool } = require('pg');
require('dotenv').config();

// Standard Replit PostgreSQL connection using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for many hosted PG instances
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
