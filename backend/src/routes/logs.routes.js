// backend/src/routes/logs.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const db = require('../config/database');

router.use(protect);

// Get system logs
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, type } = req.query;
    const userId = req.user.id;

    // For now, return mock data
    const logs = [
      {
        id: 1,
        type: 'info',
        message: 'User logged in',
        timestamp: new Date(),
        user: req.user.email
      },
      {
        id: 2,
        type: 'success',
        message: 'Agent created successfully',
        timestamp: new Date(Date.now() - 3600000),
        user: req.user.email
      }
    ];

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;