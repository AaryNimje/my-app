const db = require('../src/config/database');
const fs = require('fs').promises;
const path = require('path');

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema
    await db.query(schema);
    
    console.log('Database reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();