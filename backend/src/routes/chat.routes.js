const express = require('express');
const router = express.Router();
const enhancedChatController = require('../controllers/enhancedChatController');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Session routes
router.post('/sessions', 
  protect,
  body('title').optional().isString(),
  validateRequest,
  enhancedChatController.createSession
);

router.get('/sessions', protect, enhancedChatController.getSessions);
router.get('/sessions/:sessionId', protect, enhancedChatController.getSession);
router.delete('/sessions/:sessionId', protect, enhancedChatController.deleteSession);

// Message routes
router.get('/sessions/:sessionId/messages', protect, enhancedChatController.getMessages);
router.post('/sessions/:sessionId/messages',
  protect,
  body('content').notEmpty().withMessage('Message content is required'),
  validateRequest,
  enhancedChatController.sendMessage
);

// Sharing routes
router.put('/sessions/:sessionId/sharing', protect, enhancedChatController.updateSharing);
router.get('/shared/:sessionId', enhancedChatController.getSharedChat);

// Output files
router.get('/outputs/:outputId/download', protect, enhancedChatController.downloadOutput);

// Token usage
router.get('/usage', protect, enhancedChatController.getTokenUsage);

module.exports = router;