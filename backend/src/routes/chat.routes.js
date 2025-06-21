const express = require('express');
const router = express.Router();
const enhancedChatController = require('../controllers/enhancedChatController');
const { auth } = require('../middleware/auth');

// Use the enhanced controller
router.post('/sessions', auth, enhancedChatController.createSession);
router.get('/sessions', auth, enhancedChatController.getSessions);
router.get('/sessions/:sessionId/messages', auth, enhancedChatController.getMessages);
router.post('/sessions/:sessionId/messages', auth, enhancedChatController.sendMessage);
router.delete('/sessions/:sessionId', auth, enhancedChatController.deleteSession);
router.put('/sessions/:sessionId/sharing', auth, enhancedChatController.updateSharing);
router.get('/outputs/:outputId/download', auth, enhancedChatController.downloadOutput);
router.get('/usage', auth, enhancedChatController.getTokenUsage);

module.exports = router;