const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const recommendationController = require('../controllers/recommendationController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/recommendations
 * @desc    Get personalized recommendations for user
 * @access  Private
 */
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    handleValidationErrors,
  ],
  recommendationController.getRecommendations
);

/**
 * @route   GET /api/recommendations/similar/:productId
 * @desc    Get similar products
 * @access  Private
 */
router.get(
  '/similar/:productId',
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
    handleValidationErrors,
  ],
  recommendationController.getSimilarProducts
);

/**
 * @route   GET /api/recommendations/frequently-bought/:productId
 * @desc    Get frequently bought together products
 * @access  Private
 */
router.get(
  '/frequently-bought/:productId',
  [
    query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
    handleValidationErrors,
  ],
  recommendationController.getFrequentlyBoughtTogether
);

/**
 * @route   GET /api/recommendations/based-on-history
 * @desc    Get recommendations based on browsing history
 * @access  Private
 */
router.get(
  '/based-on-history',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    handleValidationErrors,
  ],
  recommendationController.getRecommendationsBasedOnHistory
);

/**
 * @route   POST /api/recommendations/track-view
 * @desc    Track product view for recommendations
 * @access  Private
 */
router.post(
  '/track-view',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    handleValidationErrors,
  ],
  recommendationController.trackProductView
);

module.exports = router;
