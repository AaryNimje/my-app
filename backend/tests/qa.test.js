const fs = require('fs');
const path = require('path');

describe('Q&A System Tests', () => {
  let teacherToken;
  let documentId;
  let linkCode;

  beforeAll(async () => {
    // Create and approve a teacher
    // ... setup code
  });

  describe('POST /api/qa/upload', () => {
    test('Should upload PDF document', async () => {
      const testPdfPath = path.join(__dirname, 'fixtures', 'test-qa.pdf');
      
      const res = await request(app)
        .post('/api/qa/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('pdf', testPdfPath);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.documentId).toBeDefined();
      documentId = res.body.documentId;
    });

    test('Should reject non-PDF files', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.txt');
      
      const res = await request(app)
        .post('/api/qa/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('pdf', testFilePath);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/qa/generate-link', () => {
    test('Should generate study link', async () => {
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await request(app)
        .post('/api/qa/generate-link')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          documentId,
          title: 'Test Quiz',
          description: 'Test description'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyLink.linkCode).toBeDefined();
      linkCode = res.body.studyLink.linkCode;
    });
  });

  describe('GET /api/qa/study/:linkCode', () => {
    test('Should get study content without auth', async () => {
      const res = await request(app)
        .get(`/api/qa/study/${linkCode}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.study.questions).toBeDefined();
    });
  });
});
