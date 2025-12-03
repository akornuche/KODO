const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * User Settings Controller
 * Handles user preferences and settings
 */

/**
 * Get user settings
 * GET /api/settings
 */
exports.getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          orderUpdates: true,
          promotionalEmails: true,
          newsletterSubscription: false,
          twoFactorEnabled: false,
          theme: 'light',
          language: 'en',
          currency: 'NGN',
          timezone: 'Africa/Lagos',
        },
      });
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    logger.error('Get user settings error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve settings',
    });
  }
};

/**
 * Update user settings
 * PUT /api/settings
 */
exports.updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData.userId;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    logger.info('User settings updated', { userId });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    logger.error('Update user settings error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update settings',
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/settings/notifications
 */
exports.updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      emailNotifications,
      pushNotifications,
      smsNotifications,
      orderUpdates,
      promotionalEmails,
      newsletterSubscription,
    } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        orderUpdates,
        promotionalEmails,
        newsletterSubscription,
      },
      create: {
        userId,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        orderUpdates,
        promotionalEmails,
        newsletterSubscription,
      },
    });

    logger.info('Notification settings updated', { userId });

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings,
    });
  } catch (error) {
    logger.error('Update notification settings error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update notification settings',
    });
  }
};

/**
 * Update privacy settings
 * PUT /api/settings/privacy
 */
exports.updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileVisibility, showEmail, showPhone } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        profileVisibility,
        showEmail,
        showPhone,
      },
      create: {
        userId,
        profileVisibility,
        showEmail,
        showPhone,
      },
    });

    logger.info('Privacy settings updated', { userId });

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      settings,
    });
  } catch (error) {
    logger.error('Update privacy settings error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update privacy settings',
    });
  }
};

/**
 * Enable two-factor authentication
 * POST /api/settings/2fa/enable
 */
exports.enableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;

    // TODO: Generate 2FA secret and QR code
    // For now, just enable it
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        twoFactorEnabled: true,
      },
      create: {
        userId,
        twoFactorEnabled: true,
      },
    });

    logger.info('Two-factor authentication enabled', { userId });

    res.json({
      success: true,
      message: 'Two-factor authentication enabled',
      // TODO: Return QR code and backup codes
      settings,
    });
  } catch (error) {
    logger.error('Enable 2FA error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to enable two-factor authentication',
    });
  }
};

/**
 * Disable two-factor authentication
 * POST /api/settings/2fa/disable
 */
exports.disableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        twoFactorEnabled: false,
      },
      create: {
        userId,
        twoFactorEnabled: false,
      },
    });

    logger.info('Two-factor authentication disabled', { userId });

    res.json({
      success: true,
      message: 'Two-factor authentication disabled',
      settings,
    });
  } catch (error) {
    logger.error('Disable 2FA error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to disable two-factor authentication',
    });
  }
};

/**
 * Reset settings to default
 * POST /api/settings/reset
 */
exports.resetSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        orderUpdates: true,
        promotionalEmails: true,
        newsletterSubscription: false,
        twoFactorEnabled: false,
        theme: 'light',
        language: 'en',
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
      },
      create: {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        orderUpdates: true,
        promotionalEmails: true,
        newsletterSubscription: false,
        twoFactorEnabled: false,
        theme: 'light',
        language: 'en',
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
      },
    });

    logger.info('Settings reset to default', { userId });

    res.json({
      success: true,
      message: 'Settings reset to default',
      settings,
    });
  } catch (error) {
    logger.error('Reset settings error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to reset settings',
    });
  }
};

module.exports = exports;
