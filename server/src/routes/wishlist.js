const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticateToken } = require('../../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');

/**
 * All wishlist routes require authentication
 */
router.use(authenticateToken);

/**
 * Validation rules
 */
const addToWishlistValidation = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isString(),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be 500 characters or less'),
];

/**
 * Routes
 */

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Add product to wishlist
router.post(
  '/',
  addToWishlistValidation,
  handleValidationErrors,
  wishlistController.addToWishlist
);

// Check if product is in wishlist
router.get('/check/:productId', wishlistController.checkWishlist);

// Remove product from wishlist
router.delete('/:productId', wishlistController.removeFromWishlist);

// Clear entire wishlist
router.delete('/', wishlistController.clearWishlist);

module.exports = router;
