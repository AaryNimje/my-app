const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Session routes
router.post('/sessions', chatController.createSession);
router.get('/sessions', chatController.getSessions);
router.get('/sessions/:sessionId', chatController.getSession);
router.delete('/sessions/:sessionId', chatController.closeSession);
router.put('/sessions/:sessionId', chatController.updateSession);
router.get('/sessions/:sessionId/stats', chatController.getSessionStats);

// Message routes
router.post('/sessions/:sessionId/messages', chatController.sendMessage);
router.get('/sessions/:sessionId/messages', chatController.getMessages);

// Direct message route (without session)
router.post('/messages', chatController.sendDirectMessage);

module.exports = router;