const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { upload } = require('../lib/upload');
const { authenticateToken } = require('../../middleware/auth');
const { uploadLimiter } = require('../../middleware/rateLimiter');

// All upload routes require authentication
router.use(authenticateToken);

// Apply rate limiting to all upload routes
router.use(uploadLimiter);

// Product image uploads (multiple files)
router.post('/products/:productId/images',
  upload.array('images', 10), // Allow up to 10 images
  uploadController.uploadProductImages
);

// Delete product image
router.delete('/products/:productId/images/:imageId',
  uploadController.deleteProductImage
);

// User avatar upload (single file)
router.post('/avatar',
  upload.single('avatar'),
  uploadController.uploadAvatar
);

// Delete user avatar
router.delete('/avatar',
  uploadController.deleteAvatar
);

// Get optimized image URL
router.get('/optimize/:publicId',
  uploadController.getOptimizedImage
);

module.exports = router;