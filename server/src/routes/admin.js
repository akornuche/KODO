const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * Validation rules
 */
const updateRoleValidation = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['buyer', 'seller', 'courier', 'admin'])
    .withMessage('Invalid role'),
];

const resolveDisputeValidation = [
  body('resolution')
    .notEmpty()
    .withMessage('Resolution is required')
    .isString()
    .withMessage('Resolution must be a string'),
  body('refundBuyer')
    .optional()
    .isBoolean()
    .withMessage('refundBuyer must be a boolean'),
];

/**
 * Routes
 */

// Get all users
router.get('/users', adminController.getAllUsers);

// Update user role
router.put(
  '/users/:id/role',
  updateRoleValidation,
  handleValidationErrors,
  adminController.updateUserRole
);

// Delete user
router.delete('/users/:id', adminController.deleteUser);

// Get platform statistics
router.get('/stats', adminController.getPlatformStats);

// Get analytics data
router.get('/analytics', adminController.getAnalytics);

// Get all orders
router.get('/orders', adminController.getAllOrders);

// Search orders with advanced filtering
router.get('/orders/search', adminController.searchOrders);

// Get all disputes
router.get('/disputes', adminController.getDisputes);

// Resolve a dispute
router.put(
  '/disputes/:id/resolve',
  resolveDisputeValidation,
  handleValidationErrors,
  adminController.resolveDispute
);

module.exports = router;
