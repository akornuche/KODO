const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { createLimiter } = require('../../middleware/rateLimiter');
const orderController = require('../controllers/orderController');

const router = express.Router();

/**
 * Validation rules
 */
const payOrderValidation = [
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'paid', 'shipped', 'completed', 'cancelled', 'disputed'])
    .withMessage('Invalid status'),
];

const refundValidation = [
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number'),
];

const disputeValidation = [
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isString()
    .withMessage('Reason must be a string'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .withMessage('Description must be a string'),
];

const transferValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('accountNumber')
    .isString()
    .withMessage('Account number is required')
    .matches(/^\d{10}$/)
    .withMessage('Account number must be exactly 10 digits'),
  body('accountName')
    .isString()
    .withMessage('Account name is required')
    .notEmpty()
    .withMessage('Account name cannot be empty'),
  body('bankCode')
    .isString()
    .withMessage('Bank code is required')
    .notEmpty()
    .withMessage('Bank code cannot be empty'),
];

const createOrderValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isString()
    .withMessage('Product ID must be a string'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('deliveryAddress')
    .notEmpty()
    .withMessage('Delivery address is required')
    .isString()
    .withMessage('Delivery address must be a string'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
];

/**
 * Routes
 */

// Create direct order (Buy Now)
router.post(
  '/',
  authenticateToken,
  createLimiter,
  createOrderValidation,
  handleValidationErrors,
  orderController.createDirectOrder
);

// Get all orders for current user (buyer/seller view)
router.get(
  '/',
  authenticateToken,
  orderController.getUserOrders
);

// Get order by ID
router.get(
  '/:id',
  authenticateToken,
  orderController.getOrderById
);

// Pay for an order (buyer only)
router.post(
  '/:id/pay',
  authenticateToken,
  requireRole('buyer', 'admin'),
  createLimiter,
  payOrderValidation,
  handleValidationErrors,
  orderController.payOrder
);

// Update order status
router.put(
  '/:id/status',
  authenticateToken,
  updateStatusValidation,
  handleValidationErrors,
  orderController.updateOrderStatus
);

// Release escrow (admin only)
router.post(
  '/escrow/:id/release',
  authenticateToken,
  requireRole('admin'),
  orderController.releaseEscrow
);

// Refund an order (buyer or admin)
router.post(
  '/:id/refund',
  authenticateToken,
  refundValidation,
  handleValidationErrors,
  orderController.refundOrder
);

// Create dispute for an order (buyer or seller)
router.post(
  '/:id/dispute',
  authenticateToken,
  disputeValidation,
  handleValidationErrors,
  orderController.createDispute
);

// Test bank transfer (admin only - for testing Flutterwave integration)
router.post(
  '/test-transfer',
  authenticateToken,
  requireRole('admin'),
  transferValidation,
  handleValidationErrors,
  orderController.testTransfer
);

module.exports = router;
