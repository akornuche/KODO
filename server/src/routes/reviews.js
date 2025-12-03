const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');

// Validation rules
const createReviewValidation = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  handleValidationErrors,
];

const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  handleValidationErrors,
];

// Create review (authenticated buyers only)
router.post('/', authenticateToken, createReviewValidation, reviewController.createReview);

// Update review
router.put('/:id', authenticateToken, updateReviewValidation, reviewController.updateReview);

// Delete review
router.delete('/:id', authenticateToken, reviewController.deleteReview);

// Get reviews for a product (public)
router.get('/product/:productId', reviewController.getProductReviews);

// Get reviews by user (public)
router.get('/user/:userId', reviewController.getUserReviews);

module.exports = router;
