const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Teacher routes (require authentication and teacher role)
router.post('/upload', 
  authenticateToken, 
  requireRole(['teacher', 'admin']),
  qaController.upload.single('file'),
  qaController.uploadDocument
);

router.post('/generate-link',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.generateLink
);

router.get('/documents',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.getDocuments
);

router.get('/study-links',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.getStudyLinks
);

router.get('/responses/:linkId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.getResponses
);

router.get('/history/:linkId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.getQuizHistory
);

router.get('/analytics/:linkId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.getQuizAnalytics
);

router.patch('/toggle-link/:linkId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.toggleLinkStatus
);

// NEW: Groq-specific routes
router.get('/test-groq',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.testGroqConnection
);

router.post('/regenerate/:documentId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  qaController.regenerateQuestions
);

// Public student routes (no authentication required)
router.get('/study/:linkCode', qaController.getStudyContent);
router.post('/study/:linkCode/submit', qaController.submitResponses);

// Health check for the QA system
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'QA Generator API with Groq',
    timestamp: new Date().toISOString(),
    mainPyUrl: process.env.MAIN_PY_URL || 'http://localhost:8000',
    groqConfigured: !!process.env.GROQ_API_KEY
  });
});

module.exports = router;