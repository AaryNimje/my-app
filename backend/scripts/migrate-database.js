const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    // Read and execute the new schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    console.log('✅ Database schema updated successfully');
    
    // Run seed data
    const seedPath = path.join(__dirname, '../database/seed-data.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');
    
    await db.query(seedData);
    console.log('✅ Seed data inserted successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();