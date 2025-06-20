// backend/src/routes/agent.routes.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Agent CRUD operations
router.post('/', agentController.createAgent);
router.get('/', agentController.getAgents);
router.get('/:agentId', agentController.getAgent);
router.put('/:agentId', agentController.updateAgent);
router.delete('/:agentId', agentController.deleteAgent);

// Agent execution
router.post('/:agentId/execute', agentController.executeAgent);

module.exports = router;