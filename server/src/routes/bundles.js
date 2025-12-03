const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const bundleController = require('../controllers/bundleController');

/**
 * @route   GET /api/bundles/cross-sell/:productId
 * @desc    Get cross-sell suggestions
 * @access  Public
 */
router.get(
  '/cross-sell/:productId',
  bundleController.getCrossSellSuggestions
);

/**
 * @route   GET /api/bundles/upsell/:productId
 * @desc    Get upsell suggestions
 * @access  Public
 */
router.get(
  '/upsell/:productId',
  bundleController.getUpsellSuggestions
);

/**
 * @route   POST /api/bundles
 * @desc    Create product bundle
 * @access  Private (Seller)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Bundle name is required'),
    body('productIds').isArray({ min: 2 }).withMessage('At least 2 products required'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be positive'),
    handleValidationErrors,
  ],
  bundleController.createBundle
);

/**
 * @route   POST /api/bundles/cart-recommendations
 * @desc    Get bundle recommendations for cart
 * @access  Public
 */
router.post(
  '/cart-recommendations',
  bundleController.getCartBundleRecommendations
);

module.exports = router;
