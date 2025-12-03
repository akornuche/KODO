const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const reviewPhotoController = require('../controllers/reviewPhotoController');

/**
 * @route   POST /api/review-photos/:reviewId
 * @desc    Add photos to review
 * @access  Private
 */
router.post(
  '/:reviewId',
  authenticateToken,
  [
    body('photos').isArray({ min: 1 }).withMessage('At least one photo is required'),
    body('photos.*.url').notEmpty().withMessage('Photo URL is required'),
    handleValidationErrors,
  ],
  reviewPhotoController.addReviewPhotos
);

/**
 * @route   GET /api/review-photos/review/:reviewId
 * @desc    Get photos for review
 * @access  Public
 */
router.get(
  '/review/:reviewId',
  reviewPhotoController.getReviewPhotos
);

/**
 * @route   DELETE /api/review-photos/:id
 * @desc    Delete review photo
 * @access  Private
 */
router.delete(
  '/:id',
  authenticateToken,
  reviewPhotoController.deleteReviewPhoto
);

module.exports = router;
