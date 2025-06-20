const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Workflow CRUD
router.post('/', workflowController.createWorkflow);
router.get('/', workflowController.getWorkflows);
router.get('/:workflowId', workflowController.getWorkflow);
router.put('/:workflowId', workflowController.saveWorkflow);
router.delete('/:workflowId', workflowController.deleteWorkflow);

// Workflow execution
router.post('/:workflowId/execute', workflowController.executeWorkflow);
router.get('/:workflowId/executions', workflowController.getExecutions);
router.get('/executions/:executionId', workflowController.getExecutionDetails);

// Only include these routes if they exist in the controller
if (typeof workflowController.getTemplates === 'function') {
  router.get('/templates', workflowController.getTemplates);
}
if (typeof workflowController.useTemplate === 'function') {
  router.post('/templates/:templateId/use', workflowController.useTemplate);
}

module.exports = router;
