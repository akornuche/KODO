const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const productQAController = require('../controllers/productQAController');

/**
 * @route   GET /api/products/:productId/questions
 * @desc    Get questions for product
 * @access  Public
 */
router.get(
  '/products/:productId/questions',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  productQAController.getProductQuestions
);

/**
 * @route   POST /api/products/:productId/questions
 * @desc    Ask question about product
 * @access  Private
 */
router.post(
  '/products/:productId/questions',
  authenticateToken,
  [
    body('question')
      .notEmpty()
      .withMessage('Question is required')
      .isLength({ max: 500 })
      .withMessage('Question must not exceed 500 characters'),
    handleValidationErrors,
  ],
  productQAController.askQuestion
);

/**
 * @route   PUT /api/questions/:id/answer
 * @desc    Answer question (Seller only)
 * @access  Private (Seller)
 */
router.put(
  '/questions/:id/answer',
  authenticateToken,
  [
    body('answer')
      .notEmpty()
      .withMessage('Answer is required')
      .isLength({ max: 1000 })
      .withMessage('Answer must not exceed 1000 characters'),
    handleValidationErrors,
  ],
  productQAController.answerQuestion
);

/**
 * @route   POST /api/questions/:id/helpful
 * @desc    Mark question as helpful
 * @access  Public
 */
router.post('/questions/:id/helpful', productQAController.markAsHelpful);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Private (Owner/Admin)
 */
router.delete('/questions/:id', authenticateToken, productQAController.deleteQuestion);

module.exports = router;
