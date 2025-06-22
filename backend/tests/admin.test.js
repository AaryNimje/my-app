describe('Admin Tests', () => {
  let adminToken;
  let requestId;

  beforeAll(async () => {
    // Login as admin
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123'
      });
    adminToken = res.body.token;
  });

  describe('GET /api/admin/pending-registrations', () => {
    test('Should get pending registrations', async () => {
      const res = await request(app)
        .get('/api/admin/pending-registrations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.requests)).toBe(true);
      
      if (res.body.requests.length > 0) {
        requestId = res.body.requests[0].id;
      }
    });

    test('Should reject unauthorized access', async () => {
      const res = await request(app)
        .get('/api/admin/pending-registrations');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/approve-registration/:id', () => {
    test('Should approve registration', async () => {
      if (!requestId) {
        console.log('No pending requests to approve');
        return;
      }

      const res = await request(app)
        .post(`/api/admin/approve-registration/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'teacher' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});