const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const sellerFollowController = require('../controllers/sellerFollowController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/sellers/:sellerId/follow
 * @desc    Follow seller
 * @access  Private
 */
router.post('/sellers/:sellerId/follow', sellerFollowController.followSeller);

/**
 * @route   DELETE /api/sellers/:sellerId/follow
 * @desc    Unfollow seller
 * @access  Private
 */
router.delete('/sellers/:sellerId/follow', sellerFollowController.unfollowSeller);

/**
 * @route   GET /api/sellers/following
 * @desc    Get followed sellers
 * @access  Private
 */
router.get(
  '/sellers/following',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  sellerFollowController.getFollowedSellers
);

/**
 * @route   GET /api/sellers/:sellerId/followers
 * @desc    Get seller followers
 * @access  Private
 */
router.get(
  '/sellers/:sellerId/followers',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  sellerFollowController.getSellerFollowers
);

/**
 * @route   GET /api/sellers/:sellerId/follow/check
 * @desc    Check if following seller
 * @access  Private
 */
router.get('/sellers/:sellerId/follow/check', sellerFollowController.checkIfFollowing);

/**
 * @route   GET /api/sellers/following/new-products
 * @desc    Get new products from followed sellers
 * @access  Private
 */
router.get(
  '/sellers/following/new-products',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    handleValidationErrors,
  ],
  sellerFollowController.getNewProductsFromFollowedSellers
);

module.exports = router;
