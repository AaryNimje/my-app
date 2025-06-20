// backend/src/routes/llm.routes.js
const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get available models
router.get('/models', llmController.getModels);

// Direct LLM interaction
router.post('/complete', llmController.complete);
router.post('/chat', llmController.chat);

// API Keys management
router.get('/api-keys', llmController.getApiKeys);
router.post('/api-keys', llmController.upsertApiKey);
router.delete('/api-keys/:provider', llmController.deleteApiKey);

module.exports = router;