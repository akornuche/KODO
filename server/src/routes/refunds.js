const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const refundController = require('../controllers/refundController');

const router = express.Router();

// All refund routes require authentication
router.use(authenticateToken);

/**
 * Validation rules
 */
const requestRefundValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isUUID()
    .withMessage('Order ID must be a valid UUID'),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

const processRefundValidation = [
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either "approve" or "reject"'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
];

/**
 * Routes
 */

// Request a refund
router.post('/', requestRefundValidation, handleValidationErrors, refundController.requestRefund);

// Get user's refund requests
router.get('/', refundController.getUserRefunds);

// Get refund details
router.get('/:id', refundController.getRefundById);

// Cancel refund request (buyer only)
router.put('/:id/cancel', refundController.cancelRefund);

// Process refund (admin only)
router.put('/:id/process', requireRole('admin'), processRefundValidation, handleValidationErrors, refundController.processRefund);

// Get all refunds (admin only)
router.get('/admin/all', requireRole('admin'), refundController.getAllRefunds);

module.exports = router;