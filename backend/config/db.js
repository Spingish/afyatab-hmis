// TibaMax HMIS — PostgreSQL Database Connection
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ TibaMax HMIS — Database connection FAILED:', err.message);
  } else {
    console.log('✅ TibaMax HMIS — Connected to PostgreSQL 18 (afyatab_hmis)');
    release();
  }
});

module.exports = pool;