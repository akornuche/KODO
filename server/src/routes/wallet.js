const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');

/**
 * All wallet routes require authentication
 */
router.use(authenticateToken);

/**
 * Validation rules
 */
const depositValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 100 })
    .withMessage('Minimum deposit is 100 NGN'),
  body('paymentMethod')
    .optional()
    .isString()
    .isIn(['card', 'bank_transfer', 'mobile_money'])
    .withMessage('Invalid payment method'),
];

const withdrawValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 500 })
    .withMessage('Minimum withdrawal is 500 NGN'),
  body('bankAccount')
    .notEmpty()
    .withMessage('Bank account details required'),
  body('bankAccount.accountNumber')
    .matches(/^\d{10}$/)
    .withMessage('Invalid account number'),
  body('bankAccount.accountName')
    .notEmpty()
    .withMessage('Account name required'),
  body('bankAccount.bankCode')
    .notEmpty()
    .withMessage('Bank code required'),
];

const transferValidation = [
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID required')
    .isString(),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 100 })
    .withMessage('Minimum transfer is 100 NGN'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Note must be 200 characters or less'),
];

/**
 * Routes
 */

// Get wallet balance and info
router.get('/', walletController.getWallet);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

// Deposit funds to wallet
router.post(
  '/deposit',
  depositValidation,
  handleValidationErrors,
  walletController.depositFunds
);

// Withdraw funds from wallet
router.post(
  '/withdraw',
  withdrawValidation,
  handleValidationErrors,
  walletController.withdrawFunds
);

// Transfer funds between wallets
router.post(
  '/transfer',
  transferValidation,
  handleValidationErrors,
  walletController.transferFunds
);

module.exports = router;
