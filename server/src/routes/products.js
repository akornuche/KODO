const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole, optionalAuth } = require('../../middleware/auth');
const seoMiddleware = require('../middleware/seoMiddleware');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { createLimiter } = require('../../middleware/rateLimiter');
const { upload } = require('../lib/upload');

// Validation rules
const createProductValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('condition')
    .optional()
    .isIn(['new', 'like_new', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
];

const updateProductValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('condition')
    .optional()
    .isIn(['new', 'like_new', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),
];

// Public routes (with optional auth to show personalized content)
router.get('/search', optionalAuth, productController.searchProducts);
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/:id', optionalAuth, seoMiddleware.provideSEOData('product'), productController.getProductById);

// Protected routes - Seller only
router.post(
  '/',
  authenticateToken,
  requireRole('seller', 'admin'),
  createLimiter,
  createProductValidation,
  handleValidationErrors,
  productController.createProduct
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('seller', 'admin'),
  updateProductValidation,
  handleValidationErrors,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('seller', 'admin'),
  productController.deleteProduct
);

// Image upload routes
router.post(
  '/:id/images',
  authenticateToken,
  requireRole('seller', 'admin'),
  upload.array('images', 5), // Max 5 images per upload
  productController.uploadProductImages
);

router.delete(
  '/:id/images/:imageIndex',
  authenticateToken,
  requireRole('seller', 'admin'),
  productController.deleteProductImage
);

module.exports = router;
