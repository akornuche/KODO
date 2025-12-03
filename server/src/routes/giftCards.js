const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const giftCardController = require('../controllers/giftCardController');

/**
 * @route   POST /api/gift-cards/create
 * @desc    Create gift card
 * @access  Private
 */
router.post(
  '/create',
  authenticateToken,
  [
    body('amount').isFloat({ min: 10, max: 1000 }).withMessage('Amount must be between $10 and $1000'),
    body('recipientEmail').isEmail().withMessage('Valid recipient email required'),
    body('recipientName').notEmpty().withMessage('Recipient name required'),
    handleValidationErrors,
  ],
  giftCardController.createGiftCard
);

/**
 * @route   GET /api/gift-cards/balance/:code
 * @desc    Check gift card balance
 * @access  Public
 */
router.get(
  '/balance/:code',
  giftCardController.checkBalance
);

/**
 * @route   POST /api/gift-cards/apply
 * @desc    Apply gift card to order
 * @access  Private
 */
router.post(
  '/apply',
  authenticateToken,
  [
    body('code').notEmpty().withMessage('Gift card code required'),
    body('orderId').notEmpty().withMessage('Order ID required'),
    handleValidationErrors,
  ],
  giftCardController.applyGiftCard
);

/**
 * @route   GET /api/gift-cards/my-cards
 * @desc    Get user's gift cards
 * @access  Private
 */
router.get(
  '/my-cards',
  authenticateToken,
  giftCardController.getMyGiftCards
);

module.exports = router;
