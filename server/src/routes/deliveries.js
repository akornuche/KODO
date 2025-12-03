const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const deliveryController = require('../controllers/deliveryController');

const router = express.Router();

/**
 * Validation rules
 */
const updateLocationValidation = [
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'assigned', 'in_transit', 'delivered', 'failed'])
    .withMessage('Invalid status'),
];

/**
 * Routes
 */

// Search deliveries with advanced filtering (admin only) - more specific route first
router.get(
  '/admin/search',
  authenticateToken,
  requireRole('admin'),
  deliveryController.searchDeliveries
);

// Get available deliveries (pending, unassigned) for couriers
router.get(
  '/available',
  authenticateToken,
  requireRole('courier', 'admin'),
  deliveryController.getAvailableDeliveries
);

// Get courier's assigned deliveries
router.get(
  '/',
  authenticateToken,
  requireRole('courier', 'admin'),
  deliveryController.getCourierDeliveries
);

// Get delivery by ID
router.get(
  '/:id',
  authenticateToken,
  deliveryController.getDeliveryById
);

// Courier accepts a delivery
router.post(
  '/:id/accept',
  authenticateToken,
  requireRole('courier'),
  deliveryController.acceptDelivery
);

// Update delivery location (GPS)
router.put(
  '/:id/location',
  authenticateToken,
  requireRole('courier'),
  updateLocationValidation,
  handleValidationErrors,
  deliveryController.updateDeliveryLocation
);

// Update delivery status
router.put(
  '/:id/status',
  authenticateToken,
  requireRole('courier', 'admin'),
  updateStatusValidation,
  handleValidationErrors,
  deliveryController.updateDeliveryStatus
);

module.exports = router;
