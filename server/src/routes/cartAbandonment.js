const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const cartAbandonmentController = require('../controllers/cartAbandonmentController');

/**
 * @route   POST /api/cart/track-abandonment
 * @desc    Track cart abandonment
 * @access  Public/Private
 */
router.post(
  '/track-abandonment',
  [
    body('sessionId').optional().isString().withMessage('Session ID must be a string'),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('totalValue').isFloat({ min: 0 }).withMessage('Total value must be a positive number'),
    handleValidationErrors,
  ],
  cartAbandonmentController.trackAbandonment
);

/**
 * @route   GET /api/cart/abandoned
 * @desc    Get abandoned carts (Admin only)
 * @access  Private (Admin)
 */
router.get(
  '/abandoned',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('recovered').optional().isBoolean().withMessage('Recovered must be a boolean'),
    handleValidationErrors,
  ],
  cartAbandonmentController.getAbandonedCarts
);

/**
 * @route   GET /api/cart/abandoned/mine
 * @desc    Get user's abandoned cart
 * @access  Private
 */
router.get('/abandoned/mine', authenticateToken, cartAbandonmentController.getMyAbandonedCart);

/**
 * @route   PUT /api/cart/abandoned/:id/recover
 * @desc    Mark cart as recovered
 * @access  Private
 */
router.put('/abandoned/:id/recover', authenticateToken, cartAbandonmentController.markAsRecovered);

/**
 * @route   POST /api/cart/abandoned/:id/send-email
 * @desc    Send recovery email (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/abandoned/:id/send-email',
  authenticateToken,
  [
    body('discountCode').optional().isString().withMessage('Discount code must be a string'),
    handleValidationErrors,
  ],
  cartAbandonmentController.sendRecoveryEmail
);

module.exports = router;
