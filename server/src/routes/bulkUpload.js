const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../../middleware/auth');
const bulkUploadController = require('../controllers/bulkUploadController');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// All routes require authentication and seller role
router.use(authenticateToken);

/**
 * @route   POST /api/bulk-upload/products
 * @desc    Upload products via CSV
 * @access  Private (Seller)
 */
router.post(
  '/products',
  upload.single('file'),
  bulkUploadController.bulkUploadProducts
);

/**
 * @route   GET /api/bulk-upload/template
 * @desc    Download CSV template
 * @access  Private (Seller)
 */
router.get(
  '/template',
  bulkUploadController.downloadTemplate
);

/**
 * @route   GET /api/bulk-upload/history
 * @desc    Get upload history
 * @access  Private (Seller)
 */
router.get(
  '/history',
  bulkUploadController.getUploadHistory
);

module.exports = router;
