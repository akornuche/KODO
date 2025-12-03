const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const variantController = require('../controllers/variantController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/products/:productId/variants
 * @desc    Get all variants for a product
 * @access  Private
 */
router.get(
  '/products/:productId/variants',
  variantController.getProductVariants
);

/**
 * @route   POST /api/products/:productId/variants
 * @desc    Create variant for product
 * @access  Private (Seller)
 */
router.post(
  '/products/:productId/variants',
  [
    body('name').notEmpty().withMessage('Variant name is required'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('stockQuantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer'),
    body('lowStockThreshold')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Low stock threshold must be a non-negative integer'),
    body('weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('colorHex')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color hex must be in format #RRGGBB'),
    handleValidationErrors,
  ],
  variantController.createVariant
);

/**
 * @route   PUT /api/products/:productId/variants/:variantId
 * @desc    Update variant
 * @access  Private (Seller)
 */
router.put(
  '/products/:productId/variants/:variantId',
  [
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('stockQuantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer'),
    body('lowStockThreshold')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Low stock threshold must be a non-negative integer'),
    body('weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('colorHex')
      .optional()
      .matches(/^#[0-9A-F]{6}$/i)
      .withMessage('Color hex must be in format #RRGGBB'),
    handleValidationErrors,
  ],
  variantController.updateVariant
);

/**
 * @route   DELETE /api/products/:productId/variants/:variantId
 * @desc    Delete variant
 * @access  Private (Seller)
 */
router.delete(
  '/products/:productId/variants/:variantId',
  variantController.deleteVariant
);

/**
 * @route   PUT /api/products/:productId/variants/:variantId/stock
 * @desc    Update stock quantity
 * @access  Private (Seller)
 */
router.put(
  '/products/:productId/variants/:variantId/stock',
  [
    body('stockQuantity')
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer'),
    handleValidationErrors,
  ],
  variantController.updateStock
);

/**
 * @route   GET /api/variants/low-stock
 * @desc    Get low stock variants for seller
 * @access  Private (Seller)
 */
router.get('/low-stock', variantController.getLowStockVariants);

/**
 * @route   POST /api/variants/bulk-update-stock
 * @desc    Bulk update stock quantities
 * @access  Private (Seller)
 */
router.post(
  '/bulk-update-stock',
  [
    body('updates').isArray({ min: 1 }).withMessage('Updates must be a non-empty array'),
    body('updates.*.variantId').notEmpty().withMessage('Variant ID is required'),
    body('updates.*.stockQuantity')
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer'),
    handleValidationErrors,
  ],
  variantController.bulkUpdateStock
);

module.exports = router;
