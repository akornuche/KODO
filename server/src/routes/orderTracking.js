const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const orderTrackingController = require('../controllers/orderTrackingController');

/**
 * @route   GET /api/order-tracking/:orderId
 * @desc    Get detailed order tracking
 * @access  Private
 */
router.get(
  '/:orderId',
  optionalAuth,
  orderTrackingController.getOrderTracking
);

/**
 * @route   GET /api/order-tracking/public/:orderId/:email
 * @desc    Get public order tracking (no auth)
 * @access  Public
 */
router.get(
  '/public/:orderId/:email',
  orderTrackingController.getPublicOrderTracking
);

/**
 * @route   PUT /api/order-tracking/:orderId/status
 * @desc    Update order status
 * @access  Private (Seller/Admin)
 */
router.put(
  '/:orderId/status',
  authenticateToken,
  [
    body('status').notEmpty().withMessage('Status is required'),
    handleValidationErrors,
  ],
  orderTrackingController.updateOrderStatus
);

module.exports = router;
