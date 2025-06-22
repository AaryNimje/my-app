const request = require('supertest');
const app = require('../server');
const db = require('../src/config/database');

describe('Authentication Tests', () => {
  let adminToken;
  let teacherToken;

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  });

  afterAll(async () => {
    // Clean up
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
    await db.end();
  });

  describe('POST /api/auth/register', () => {
    test('Should register new user with pending status', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'teacher@test.com',
          password: 'password123',
          full_name: 'Test Teacher',
          requested_role: 'teacher'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.requiresApproval).toBe(true);
    });

    test('Should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'teacher@test.com',
          password: 'password123',
          full_name: 'Test Teacher',
          requested_role: 'teacher'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    test('Should reject pending user login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'teacher@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('pending');
    });

    test('Should login approved admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      adminToken = res.body.token;
    });
  });
});
