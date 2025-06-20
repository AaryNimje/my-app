const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', integrationController.getIntegrations);
router.post('/google/init', integrationController.initGoogleAuth);
router.get('/google/callback', integrationController.googleCallback);
router.post('/email', integrationController.addEmailIntegration);
router.delete('/:integrationId', integrationController.deleteIntegration);

module.exports = router;