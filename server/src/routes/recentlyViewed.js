const express = require('express');
const router = express.Router();
const recentlyViewedController = require('../controllers/recentlyViewedController');

/**
 * @route   POST /api/recently-viewed/:productId
 * @desc    Track product view
 * @access  Public
 */
router.post(
  '/:productId',
  recentlyViewedController.trackView
);

/**
 * @route   GET /api/recently-viewed
 * @desc    Get recently viewed products
 * @access  Public
 */
router.get(
  '/',
  recentlyViewedController.getRecentlyViewed
);

/**
 * @route   DELETE /api/recently-viewed
 * @desc    Clear recently viewed
 * @access  Public
 */
router.delete(
  '/',
  recentlyViewedController.clearRecentlyViewed
);

module.exports = router;
