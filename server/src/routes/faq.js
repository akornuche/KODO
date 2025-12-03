const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const faqController = require('../controllers/faqController');

/**
 * @route   GET /api/faq/categories
 * @desc    Get all FAQ categories with articles
 * @access  Public
 */
router.get('/categories', faqController.getFAQCategories);

/**
 * @route   GET /api/faq/categories/:slug
 * @desc    Get FAQ category by slug
 * @access  Public
 */
router.get('/categories/:slug', faqController.getFAQCategory);

/**
 * @route   GET /api/faq/articles/:slug
 * @desc    Get FAQ article by slug
 * @access  Public
 */
router.get('/articles/:slug', faqController.getFAQArticle);

/**
 * @route   GET /api/faq/search
 * @desc    Search FAQ articles
 * @access  Public
 */
router.get(
  '/search',
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2 })
      .withMessage('Search query must be at least 2 characters'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    handleValidationErrors,
  ],
  faqController.searchFAQ
);

/**
 * @route   POST /api/faq/articles/:id/helpful
 * @desc    Mark article as helpful/not helpful
 * @access  Public
 */
router.post(
  '/articles/:id/helpful',
  [
    body('helpful').isBoolean().withMessage('Helpful must be a boolean'),
    handleValidationErrors,
  ],
  faqController.markArticleHelpful
);

/**
 * @route   POST /api/faq/categories
 * @desc    Create FAQ category (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/categories',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('icon').optional().isString().withMessage('Icon must be a string'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
    handleValidationErrors,
  ],
  faqController.createFAQCategory
);

/**
 * @route   POST /api/faq/articles
 * @desc    Create FAQ article (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/articles',
  authenticateToken,
  [
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    handleValidationErrors,
  ],
  faqController.createFAQArticle
);

/**
 * @route   PUT /api/faq/articles/:id
 * @desc    Update FAQ article (Admin only)
 * @access  Private (Admin)
 */
router.put('/articles/:id', authenticateToken, faqController.updateFAQArticle);

module.exports = router;
