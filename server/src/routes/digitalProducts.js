const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const digitalProductController = require('../controllers/digitalProductController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/digital-products/:productId/generate-token
 * @desc    Generate download token for purchased digital product
 * @access  Private (Buyer)
 */
router.post(
  '/:productId/generate-token',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    handleValidationErrors,
  ],
  digitalProductController.generateDownloadToken
);

/**
 * @route   GET /api/digital-products/download/:token
 * @desc    Download digital product with token
 * @access  Private
 */
router.get(
  '/download/:token',
  digitalProductController.downloadDigitalProduct
);

/**
 * @route   GET /api/digital-products/my-products
 * @desc    Get user's purchased digital products
 * @access  Private
 */
router.get(
  '/my-products',
  digitalProductController.getUserDigitalProducts
);

/**
 * @route   GET /api/digital-products/stats
 * @desc    Get download statistics (seller)
 * @access  Private (Seller)
 */
router.get(
  '/stats',
  digitalProductController.getDownloadStats
);

module.exports = router;
