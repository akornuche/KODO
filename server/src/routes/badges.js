const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const badgeController = require('../controllers/badgeController');

/**
 * @route   GET /api/badges/product/:productId
 * @desc    Get product badges
 * @access  Public
 */
router.get(
  '/product/:productId',
  badgeController.getProductBadges
);

/**
 * @route   POST /api/badges/custom
 * @desc    Set custom badge
 * @access  Private (Seller/Admin)
 */
router.post(
  '/custom',
  authenticateToken,
  [
    body('productId').notEmpty().withMessage('Product ID required'),
    body('label').notEmpty().withMessage('Label required'),
    body('color').notEmpty().withMessage('Color required'),
    handleValidationErrors,
  ],
  badgeController.setCustomBadge
);

module.exports = router;
