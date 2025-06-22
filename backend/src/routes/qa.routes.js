// backend/src/routes/qa.routes.js
const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');
const { protect, authorize } = require('../middleware/auth');

// Teacher routes
router.post('/upload', protect, authorize('teacher'), qaController.upload.single('pdf'), qaController.uploadDocument);
router.post('/generate-link', protect, authorize('teacher'), qaController.generateLink);
router.get('/documents', protect, authorize('teacher'), qaController.getDocuments);
router.get('/study-links', protect, authorize('teacher'), qaController.getStudyLinks);
router.get('/responses/:linkId', protect, authorize('teacher'), qaController.getResponses);

// Public routes for students
router.get('/study/:linkCode', qaController.getStudyContent);
router.post('/study/:linkCode/submit', qaController.submitResponses);

module.exports = router;