// backend/src/routes/integration.routes.js
const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Integration management
router.get('/', integrationController.getIntegrations);
router.post('/email', integrationController.addEmailIntegration);
router.delete('/:integrationId', integrationController.deleteIntegration);

// Google OAuth (placeholder)
router.post('/google/auth', integrationController.googleAuth);

module.exports = router;