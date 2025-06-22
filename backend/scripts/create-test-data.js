const bcrypt = require('bcrypt');
const db = require('../src/config/database');

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create admin if not exists
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.query(`
      INSERT INTO users (email, password_hash, full_name, role, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@example.com', adminPassword, 'System Admin', 'admin', 'approved', true]);

    // Create test teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    await db.query(`
      INSERT INTO users (email, password_hash, full_name, role, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['teacher@example.com', teacherPassword, 'Test Teacher', 'teacher', 'approved', true]);

    // Create pending student
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentResult = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role, requested_role, status, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['student@example.com', studentPassword, 'Test Student', 'student', 'student', 'pending', true]);

    if (studentResult.rows.length > 0) {
      // Create registration request
      await db.query(`
        INSERT INTO registration_requests (email, full_name, requested_role, user_id)
        VALUES ($1, $2, $3, $4)
      `, ['student@example.com', 'Test Student', 'student', studentResult.rows[0].id]);
    }

    console.log('Test data created successfully!');
    console.log('\nTest accounts:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Teacher: teacher@example.com / teacher123');
    console.log('Student (pending): student@example.com / student123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();