const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken, optionalAuth } = require('../../middleware/auth');
const guestCheckoutController = require('../controllers/guestCheckoutController');

/**
 * @route   POST /api/guest-checkout/session
 * @desc    Create guest checkout session
 * @access  Public
 */
router.post(
  '/session',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').notEmpty().withMessage('Name required'),
    handleValidationErrors,
  ],
  guestCheckoutController.createGuestSession
);

/**
 * @route   POST /api/guest-checkout/order
 * @desc    Guest checkout
 * @access  Public
 */
router.post(
  '/order',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').notEmpty().withMessage('Name required'),
    body('shippingAddress').notEmpty().withMessage('Shipping address required'),
    body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
    handleValidationErrors,
  ],
  guestCheckoutController.guestCheckout
);

/**
 * @route   POST /api/guest-checkout/convert
 * @desc    Convert guest to registered user
 * @access  Public
 */
router.post(
  '/convert',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidationErrors,
  ],
  guestCheckoutController.convertGuestAccount
);

/**
 * @route   GET /api/guest-checkout/track/:orderId/:email
 * @desc    Track guest order
 * @access  Public
 */
router.get(
  '/track/:orderId/:email',
  guestCheckoutController.trackGuestOrder
);

module.exports = router;
