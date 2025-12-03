const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const sizeGuideController = require('../controllers/sizeGuideController');

/**
 * @route   POST /api/size-guides
 * @desc    Create size guide
 * @access  Private (Seller)
 */
router.post(
  '/',
  authenticateToken,
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('measurements').notEmpty().withMessage('Measurements are required'),
    handleValidationErrors,
  ],
  sizeGuideController.createSizeGuide
);

/**
 * @route   GET /api/size-guides/product/:productId
 * @desc    Get size guides for product
 * @access  Public
 */
router.get(
  '/product/:productId',
  sizeGuideController.getProductSizeGuides
);

/**
 * @route   PUT /api/size-guides/:id
 * @desc    Update size guide
 * @access  Private (Seller)
 */
router.put(
  '/:id',
  authenticateToken,
  sizeGuideController.updateSizeGuide
);

/**
 * @route   DELETE /api/size-guides/:id
 * @desc    Delete size guide
 * @access  Private (Seller)
 */
router.delete(
  '/:id',
  authenticateToken,
  sizeGuideController.deleteSizeGuide
);

module.exports = router;
