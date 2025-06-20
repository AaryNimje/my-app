// backend/src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Neon requires SSL
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased for cloud connection
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon database successfully');
    
    // Test query
    const result = await client.query('SELECT current_database(), version()');
    console.log('Database:', result.rows[0].current_database);
    
    client.release();
  } catch (err) {
    console.error('❌ Neon database connection failed:', err.message);
    console.error('\nPlease check:');
    console.error('1. Your DATABASE_URL in .env file is correct');
    console.error('2. Format should be: postgresql://user:password@host/database?sslmode=require');
    console.error('3. You can find this in your Neon dashboard under "Connection Details"');
    
    // Don't exit the process, just log the error
    // The server can still run and you can fix the connection
  }
};

// Start connection test
testConnection();

// Error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.log('Slow query alert', { 
          text: text.substring(0, 50) + '...', 
          duration: duration + 'ms', 
          rows: res.rowCount 
        });
      }
      return res;
    } catch (err) {
      console.error('Query error:', err.message);
      console.error('Query was:', text.substring(0, 100));
      throw err;
    }
  },
  pool,
  testConnection
};