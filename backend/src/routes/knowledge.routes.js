// backend/src/routes/knowledge.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|docx|xlsx|csv|txt|md|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.use(protect);

// Upload document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // TODO: Process document and store in vector database
    
    res.json({
      success: true,
      document: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List documents
router.get('/documents', async (req, res) => {
  try {
    // TODO: Implement document listing from database
    res.json({
      success: true,
      documents: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search documents
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    // TODO: Implement vector search
    
    res.json({
      success: true,
      results: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;