const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const shippingLabelController = require('../controllers/shippingLabelController');

/**
 * @route   POST /api/shipping-labels/generate
 * @desc    Generate shipping label
 * @access  Private (Seller)
 */
router.post(
  '/generate',
  authenticateToken,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('carrier').isIn(['USPS', 'UPS', 'FedEx', 'DHL']).withMessage('Invalid carrier'),
    body('serviceType').isIn(['standard', 'express', 'overnight']).withMessage('Invalid service type'),
    body('packageWeight').isFloat({ min: 0.1 }).withMessage('Package weight must be positive'),
    handleValidationErrors,
  ],
  shippingLabelController.generateShippingLabel
);

/**
 * @route   GET /api/shipping-labels/:orderId
 * @desc    Get shipping label
 * @access  Private
 */
router.get(
  '/:orderId',
  authenticateToken,
  shippingLabelController.getShippingLabel
);

/**
 * @route   POST /api/shipping-labels/rates
 * @desc    Get carrier rates
 * @access  Public
 */
router.post(
  '/rates',
  [
    body('weight').isFloat({ min: 0.1 }).withMessage('Weight must be positive'),
    handleValidationErrors,
  ],
  shippingLabelController.getCarrierRates
);

/**
 * @route   DELETE /api/shipping-labels/:orderId
 * @desc    Void shipping label
 * @access  Private (Seller)
 */
router.delete(
  '/:orderId',
  authenticateToken,
  shippingLabelController.voidShippingLabel
);

module.exports = router;
