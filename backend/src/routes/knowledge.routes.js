// backend/src/routes/knowledge.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

// Document management
router.get('/documents', async (req, res) => {
  res.json({ success: true, documents: [] });
});

router.post('/documents/upload', async (req, res) => {
  res.json({ success: true, message: 'Document uploaded' });
});

router.delete('/documents/:id', async (req, res) => {
  res.json({ success: true, message: 'Document deleted' });
});

// Search
router.post('/search', async (req, res) => {
  res.json({ success: true, results: [] });
});

module.exports = router;