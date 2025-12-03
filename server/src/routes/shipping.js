const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const shippingController = require('../controllers/shippingController');

const router = express.Router();

/**
 * Validation rules
 */
const calculateShippingValidation = [
  body('fromLocation')
    .isObject()
    .withMessage('fromLocation must be an object'),
  body('fromLocation.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('fromLocation.lat must be a valid latitude'),
  body('fromLocation.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('fromLocation.lng must be a valid longitude'),
  body('toLocation')
    .isObject()
    .withMessage('toLocation must be an object'),
  body('toLocation.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('toLocation.lat must be a valid latitude'),
  body('toLocation.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('toLocation.lng must be a valid longitude'),
  body('weight')
    .isFloat({ min: 0.1 })
    .withMessage('weight must be a positive number'),
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'free'])
    .withMessage('Invalid shipping method'),
  body('orderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('orderValue must be a positive number'),
];

const validateAddressValidation = [
  body('address')
    .isObject()
    .withMessage('address must be an object'),
  body('address.street')
    .isString()
    .trim()
    .isLength({ min: 5 })
    .withMessage('street must be at least 5 characters'),
  body('address.city')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('city must be at least 2 characters'),
  body('address.postalCode')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('postalCode is required'),
  body('address.country')
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('country must be at least 2 characters'),
];

const generateTrackingValidation = [
  body('orderId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('orderId is required'),
  body('shippingMethod')
    .isIn(['standard', 'express', 'overnight', 'free'])
    .withMessage('Invalid shipping method'),
];

const distanceQueryValidation = [
  query('fromLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('fromLat must be a valid latitude'),
  query('fromLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('fromLng must be a valid longitude'),
  query('toLat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('toLat must be a valid latitude'),
  query('toLng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('toLng must be a valid longitude'),
];

const optionsQueryValidation = [
  query('distance')
    .isFloat({ min: 0 })
    .withMessage('distance must be a positive number'),
  query('weight')
    .isFloat({ min: 0.1 })
    .withMessage('weight must be a positive number'),
  query('orderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('orderValue must be a positive number'),
];

/**
 * Routes
 */

// Calculate shipping cost
router.post(
  '/calculate',
  authenticateToken,
  calculateShippingValidation,
  handleValidationErrors,
  shippingController.calculateShipping
);

// Get available shipping options
router.get(
  '/options',
  authenticateToken,
  optionsQueryValidation,
  handleValidationErrors,
  shippingController.getShippingOptions
);

// Validate shipping address
router.post(
  '/validate-address',
  authenticateToken,
  validateAddressValidation,
  handleValidationErrors,
  shippingController.validateAddress
);

// Calculate distance between coordinates
router.get(
  '/distance',
  authenticateToken,
  distanceQueryValidation,
  handleValidationErrors,
  shippingController.calculateDistance
);

// Generate tracking number (seller or admin only)
router.post(
  '/generate-tracking',
  authenticateToken,
  generateTrackingValidation,
  handleValidationErrors,
  shippingController.generateTracking
);

// Estimate delivery date
router.get(
  '/estimate-delivery',
  authenticateToken,
  shippingController.estimateDelivery
);

module.exports = router;
