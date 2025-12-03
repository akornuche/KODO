const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const productComparisonController = require('../controllers/productComparisonController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/product-comparison
 * @desc    Save product comparison
 * @access  Private
 */
router.post(
  '/',
  [
    body('productIds').isArray({ min: 2, max: 10 }).withMessage('Provide 2-10 product IDs'),
    handleValidationErrors,
  ],
  productComparisonController.saveComparison
);

/**
 * @route   GET /api/product-comparison
 * @desc    Get user's saved comparisons
 * @access  Private
 */
router.get(
  '/',
  productComparisonController.getUserComparisons
);

/**
 * @route   POST /api/product-comparison/compare
 * @desc    Compare products
 * @access  Public
 */
router.post(
  '/compare',
  [
    body('productIds').isArray({ min: 2 }).withMessage('At least 2 product IDs required'),
    handleValidationErrors,
  ],
  productComparisonController.compareProducts
);

/**
 * @route   DELETE /api/product-comparison/:id
 * @desc    Delete comparison
 * @access  Private
 */
router.delete(
  '/:id',
  productComparisonController.deleteComparison
);

module.exports = router;