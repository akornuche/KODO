const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const couponsController = require('../controllers/couponsController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');

const createCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code must contain only uppercase letters and numbers'),
  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('discountValue')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  body('validUntil')
    .isISO8601()
    .withMessage('Valid until date must be a valid ISO 8601 date'),
];

// Validate coupon (public for checkout)
router.post(
  '/validate',
  authenticateToken,
  body('code').notEmpty().withMessage('Coupon code is required'),
  body('orderAmount').isFloat({ min: 0 }).withMessage('Order amount must be provided'),
  handleValidationErrors,
  couponsController.validateCoupon
);

// Admin routes
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  couponsController.getAllCoupons
);

router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  createCouponValidation,
  handleValidationErrors,
  couponsController.createCoupon
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  couponsController.updateCoupon
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  couponsController.deactivateCoupon
);

module.exports = router;
