// backend/scripts/create-test-user.js
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestUser() {
  try {
    console.log('Creating test users for Neon database...\n');

    // Check if admin user already exists
    const checkUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['admin@example.com']
    );

    if (checkUser.rows.length > 0) {
      console.log('User admin@example.com already exists');
      
      // Update the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);
      
      await pool.query(
        'UPDATE users SET password_hash = $1, is_active = true WHERE email = $2',
        [passwordHash, 'admin@example.com']
      );
      
      console.log('✓ Password updated for admin@example.com');
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email`,
        ['admin@example.com', passwordHash, 'Admin User', 'admin', true]
      );

      console.log('✓ Created admin user:', result.rows[0].email);
    }

    // Also create a regular test user
    const checkTestUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@example.com']
    );

    if (checkTestUser.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('test123', salt);

      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test@example.com', passwordHash, 'Test User', 'user', true]
      );
      
      console.log('✓ Created test user: test@example.com');
    } else {
      console.log('Test user already exists');
    }

    console.log('\n✅ Test users ready!');
    console.log('\nYou can now login with:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Account:');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
    console.log('\nTest Account:');
    console.log('Email: test@example.com');
    console.log('Password: test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Error creating test user:', error.message);
    if (error.message.includes('users')) {
      console.error('\nThe users table might not exist.');
      console.error('Please run: node scripts/setup-neon-database.js first');
    }
  } finally {
    await pool.end();
  }
}

createTestUser();