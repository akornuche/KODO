const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');

/**
 * Get current user profile (extended)
 * GET /api/users/profile
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * Update user profile
 * PUT /api/users/profile
 */
router.put(
  '/profile',
  authenticateToken,
  [
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    handleValidationErrors,
  ],
  userController.updateProfile
);

/**
 * Change password
 * PUT /api/users/password
 */
router.put(
  '/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    handleValidationErrors,
  ],
  userController.changePassword
);

/**
 * Update courier location
 * PUT /api/users/location
 */
router.put(
  '/location',
  authenticateToken,
  requireRole('courier'),
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    handleValidationErrors,
  ],
  userController.updateLocation
);

/**
 * Delete user account (self-deletion)
 * DELETE /api/users/account
 */
router.delete(
  '/account',
  authenticateToken,
  [body('password').notEmpty().withMessage('Password is required'), handleValidationErrors],
  userController.deleteAccount
);

/**
 * Get user statistics
 * GET /api/users/stats
 */
router.get('/stats', authenticateToken, userController.getUserStats);

/**
 * Get buyer dashboard statistics
 * GET /api/users/dashboard/buyer
 */
router.get('/dashboard/buyer', authenticateToken, requireRole('buyer'), userController.getBuyerStats);

/**
 * Get seller dashboard statistics
 * GET /api/users/dashboard/seller
 */
router.get('/dashboard/seller', authenticateToken, requireRole('seller'), userController.getSellerStats);

/**
 * Get seller bank account information
 * GET /api/users/bank-account
 */
router.get('/bank-account', authenticateToken, requireRole('seller'), userController.getBankAccount);

/**
 * Update seller bank account information
 * PUT /api/users/bank-account
 */
router.put(
  '/bank-account',
  authenticateToken,
  requireRole('seller'),
  [
    body('bankName').notEmpty().withMessage('Bank name is required'),
    body('accountNumber').matches(/^\d{10}$/).withMessage('Account number must be 10 digits'),
    body('accountName').notEmpty().withMessage('Account name is required'),
    body('bankCode').notEmpty().withMessage('Bank code is required'),
    handleValidationErrors,
  ],
  userController.updateBankAccount
);

module.exports = router;
