// backend/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/pending-registrations', adminController.getPendingRegistrations);
router.post('/approve-registration/:requestId', adminController.approveRegistration);
router.post('/reject-registration/:requestId', adminController.rejectRegistration);
router.get('/users', adminController.getAllUsers);

module.exports = router;