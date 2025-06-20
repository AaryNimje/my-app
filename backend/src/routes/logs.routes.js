const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Execution logs
router.get('/executions', logsController.getExecutionLogs);
router.get('/executions/:executionId', logsController.getExecutionDetails);

// System logs (admin only)
router.get('/system', authorize('admin'), logsController.getSystemLogs);

// Error logs
router.get('/errors', logsController.getErrorLogs);

// Activity logs
router.get('/activity', logsController.getActivityLogs);

// Token usage logs
router.get('/token-usage', logsController.getTokenUsageLogs);

// Export logs
router.post('/export', logsController.exportLogs);

module.exports = router;