const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const settingsController = require('../controllers/settingsController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/', settingsController.getUserSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/', settingsController.updateUserSettings);

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/notifications',
  [
    body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be a boolean'),
    body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be a boolean'),
    body('smsNotifications').optional().isBoolean().withMessage('SMS notifications must be a boolean'),
    body('orderUpdates').optional().isBoolean().withMessage('Order updates must be a boolean'),
    body('promotionalEmails').optional().isBoolean().withMessage('Promotional emails must be a boolean'),
    body('newsletterSubscription').optional().isBoolean().withMessage('Newsletter subscription must be a boolean'),
    handleValidationErrors,
  ],
  settingsController.updateNotificationSettings
);

/**
 * @route   PUT /api/settings/privacy
 * @desc    Update privacy settings
 * @access  Private
 */
router.put(
  '/privacy',
  [
    body('profileVisibility')
      .optional()
      .isIn(['public', 'private', 'friends'])
      .withMessage('Invalid profile visibility'),
    body('showEmail').optional().isBoolean().withMessage('Show email must be a boolean'),
    body('showPhone').optional().isBoolean().withMessage('Show phone must be a boolean'),
    handleValidationErrors,
  ],
  settingsController.updatePrivacySettings
);

/**
 * @route   POST /api/settings/2fa/enable
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post('/2fa/enable', settingsController.enableTwoFactor);

/**
 * @route   POST /api/settings/2fa/disable
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post('/2fa/disable', settingsController.disableTwoFactor);

/**
 * @route   POST /api/settings/reset
 * @desc    Reset settings to default
 * @access  Private
 */
router.post('/reset', settingsController.resetSettings);

module.exports = router;
