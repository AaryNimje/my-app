// ========================================
// backend/src/routes/llm.routes.js
const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get available models
router.get('/models', llmController.getModels);

// Test model
router.post('/models/:modelId/test', llmController.testModel);

// Completion endpoint
router.post('/complete', llmController.complete);

// Chat endpoint
router.post('/chat', llmController.chat);

// Stream chat endpoint
router.post('/chat/stream', llmController.streamChat);

// Get user API keys
router.get('/api-keys', llmController.getUserApiKeys);

// Add/update API key
router.post('/api-keys', llmController.upsertApiKey);

// Delete API key
router.delete('/api-keys/:provider', llmController.deleteApiKey);

// Token usage stats
router.get('/usage', llmController.getUsageStats);

module.exports = router;