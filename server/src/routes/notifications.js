const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const notificationsController = require('../controllers/notificationsController');
const smsService = require('../lib/smsService');

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

/**
 * Validation rules
 */
const updatePreferencesValidation = [
  body('email')
    .optional()
    .isObject()
    .withMessage('Email preferences must be an object'),
  body('email.orderUpdates')
    .optional()
    .isBoolean()
    .withMessage('orderUpdates must be a boolean'),
  body('email.paymentNotifications')
    .optional()
    .isBoolean()
    .withMessage('paymentNotifications must be a boolean'),
  body('email.deliveryUpdates')
    .optional()
    .isBoolean()
    .withMessage('deliveryUpdates must be a boolean'),
  body('email.bidNotifications')
    .optional()
    .isBoolean()
    .withMessage('bidNotifications must be a boolean'),
  body('email.refundNotifications')
    .optional()
    .isBoolean()
    .withMessage('refundNotifications must be a boolean'),
  body('email.disputeNotifications')
    .optional()
    .isBoolean()
    .withMessage('disputeNotifications must be a boolean'),
  body('email.marketingEmails')
    .optional()
    .isBoolean()
    .withMessage('marketingEmails must be a boolean'),
  body('push')
    .optional()
    .isObject()
    .withMessage('Push preferences must be an object'),
  body('push.orderUpdates')
    .optional()
    .isBoolean()
    .withMessage('orderUpdates must be a boolean'),
  body('push.deliveryUpdates')
    .optional()
    .isBoolean()
    .withMessage('deliveryUpdates must be a boolean'),
  body('push.bidNotifications')
    .optional()
    .isBoolean()
    .withMessage('bidNotifications must be a boolean'),
];

const deviceTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Device token is required'),
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
];

const pushSubscriptionValidation = [
  body('subscription')
    .isObject()
    .withMessage('Subscription must be an object'),
  body('subscription.endpoint')
    .notEmpty()
    .withMessage('Subscription endpoint is required'),
];

const markReadValidation = [
  body('notificationIds')
    .isArray()
    .withMessage('notificationIds must be an array'),
  body('notificationIds.*')
    .isString()
    .withMessage('Each notification ID must be a string'),
];

const smsValidation = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 160 })
    .withMessage('Message must be 160 characters or less'),
];

/**
 * Routes
 */

// Get user notification preferences
router.get('/preferences', notificationsController.getNotificationPreferences);

// Update user notification preferences
router.put(
  '/preferences',
  updatePreferencesValidation,
  handleValidationErrors,
  notificationsController.updateNotificationPreferences
);

// Send test notification
router.post('/test', notificationsController.sendTestNotification);

// Register device token for push notifications
router.post(
  '/device-token',
  deviceTokenValidation,
  handleValidationErrors,
  notificationsController.registerDeviceToken
);

// Register web push subscription
router.post(
  '/push-subscription',
  pushSubscriptionValidation,
  handleValidationErrors,
  notificationsController.registerPushSubscription
);

// Get unread notifications
router.get('/unread', notificationsController.getUnreadNotifications);

// Mark notifications as read
router.put(
  '/mark-read',
  markReadValidation,
  handleValidationErrors,
  notificationsController.markNotificationsAsRead
);

// Send test SMS (admin only)
router.post(
  '/test-sms',
  smsValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: true,
          message: 'Admin access required for SMS testing',
          code: 'ADMIN_REQUIRED',
          requestId: req.id,
        });
      }

      const result = await smsService.sendSMS(phoneNumber, message);

      res.json({
        message: 'Test SMS sent successfully',
        result,
      });
    } catch (error) {
      res.status(500).json({
        error: true,
        message: 'Failed to send test SMS',
        code: 'SMS_TEST_ERROR',
        details: error.message,
        requestId: req.id,
      });
    }
  }
);

module.exports = router;