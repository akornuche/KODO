const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

/**
 * @route   POST /api/subscriptions/plans
 * @desc    Create subscription plan
 * @access  Private (Seller)
 */
router.post(
  '/plans',
  authenticateToken,
  [
    body('productId').notEmpty().withMessage('Product ID required'),
    body('interval').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid interval'),
    handleValidationErrors,
  ],
  subscriptionController.createSubscriptionPlan
);

/**
 * @route   POST /api/subscriptions/subscribe
 * @desc    Subscribe to product
 * @access  Private
 */
router.post(
  '/subscribe',
  authenticateToken,
  [
    body('productId').notEmpty().withMessage('Product ID required'),
    body('interval').notEmpty().withMessage('Interval required'),
    body('shippingAddress').notEmpty().withMessage('Shipping address required'),
    handleValidationErrors,
  ],
  subscriptionController.subscribe
);

/**
 * @route   GET /api/subscriptions/my-subscriptions
 * @desc    Get user subscriptions
 * @access  Private
 */
router.get(
  '/my-subscriptions',
  authenticateToken,
  subscriptionController.getUserSubscriptions
);

/**
 * @route   DELETE /api/subscriptions/:subscriptionId
 * @desc    Cancel subscription
 * @access  Private
 */
router.delete(
  '/:subscriptionId',
  authenticateToken,
  subscriptionController.cancelSubscription
);

module.exports = router;
