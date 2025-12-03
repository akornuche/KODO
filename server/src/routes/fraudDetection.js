const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const fraudDetectionController = require('../controllers/fraudDetectionController');

/**
 * @route   POST /api/fraud-detection/analyze
 * @desc    Analyze fraud risk for order
 * @access  Private
 */
router.post(
  '/analyze',
  authenticateToken,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount required'),
    handleValidationErrors,
  ],
  fraudDetectionController.analyzeFraudRisk
);

/**
 * @route   GET /api/fraud-detection/alerts
 * @desc    Get fraud alerts
 * @access  Private (Admin/Seller)
 */
router.get(
  '/alerts',
  authenticateToken,
  fraudDetectionController.getFraudAlerts
);

/**
 * @route   POST /api/fraud-detection/block-user
 * @desc    Block suspicious user
 * @access  Private (Admin)
 */
router.post(
  '/block-user',
  authenticateToken,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
    handleValidationErrors,
  ],
  fraudDetectionController.blockSuspiciousUser
);

/**
 * @route   GET /api/fraud-detection/stats
 * @desc    Get fraud statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  authenticateToken,
  fraudDetectionController.getFraudStats
);

module.exports = router;
