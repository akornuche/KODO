const i18nService = require('../lib/i18nService');
const logger = require('../lib/logger');

/**
 * Internationalization controller
 */

/**
 * Get current locale information
 * GET /api/i18n/locale
 */
exports.getLocale = (req, res) => {
  try {
    const locale = i18nService.getLocale();
    const localeInfo = i18nService.getLocaleInfo(locale);

    res.json({
      success: true,
      data: {
        locale,
        ...localeInfo
      }
    });
  } catch (error) {
    logger.error('Get locale error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locale information'
    });
  }
};

/**
 * Set user locale
 * POST /api/i18n/locale
 */
exports.setLocale = async (req, res) => {
  try {
    const { locale } = req.body;

    if (!locale || !i18nService.getSupportedLocales().includes(locale)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid locale. Supported locales: ' + i18nService.getSupportedLocales().join(', ')
      });
    }

    // Set in service
    i18nService.setLocale(locale);

    // Update user preference in database if logged in
    if (req.user) {
      const prisma = require('../lib/prisma');
      await prisma.user.update({
        where: { id: req.user.id },
        data: { locale }
      });

      logger.info('User locale updated', {
        requestId: req.id,
        userId: req.user.id,
        locale
      });
    }

    const localeInfo = i18nService.getLocaleInfo(locale);

    res.json({
      success: true,
      message: 'Locale updated successfully',
      data: {
        locale,
        ...localeInfo
      }
    });
  } catch (error) {
    logger.error('Set locale error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set locale'
    });
  }
};

/**
 * Get supported locales
 * GET /api/i18n/locales
 */
exports.getSupportedLocales = (req, res) => {
  try {
    const locales = i18nService.getSupportedLocales().map(locale => ({
      code: locale,
      ...i18nService.getLocaleInfo(locale)
    }));

    res.json({
      success: true,
      data: locales
    });
  } catch (error) {
    logger.error('Get supported locales error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported locales'
    });
  }
};

/**
 * Get translations for current locale
 * GET /api/i18n/translations
 */
exports.getTranslations = (req, res) => {
  try {
    const translations = i18nService.getTranslations();

    res.json({
      success: true,
      data: {
        locale: i18nService.getLocale(),
        translations
      }
    });
  } catch (error) {
    logger.error('Get translations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get translations'
    });
  }
};

/**
 * Detect and set locale from request
 * POST /api/i18n/detect
 */
exports.detectLocale = (req, res) => {
  try {
    const detectedLocale = i18nService.detectLocale(req);
    i18nService.setLocale(detectedLocale);

    const localeInfo = i18nService.getLocaleInfo(detectedLocale);

    res.json({
      success: true,
      data: {
        detected: detectedLocale,
        ...localeInfo
      }
    });
  } catch (error) {
    logger.error('Detect locale error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect locale'
    });
  }
};

/**
 * Format currency
 * GET /api/i18n/format/currency?amount=1000
 */
exports.formatCurrency = (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount parameter required'
      });
    }

    const formatted = i18nService.formatCurrency(parseFloat(amount));

    res.json({
      success: true,
      data: {
        amount: parseFloat(amount),
        formatted,
        locale: i18nService.getLocale()
      }
    });
  } catch (error) {
    logger.error('Format currency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to format currency'
    });
  }
};

/**
 * Format date
 * GET /api/i18n/format/date?date=2024-01-01
 */
exports.formatDate = (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter required'
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const formatted = i18nService.formatDate(dateObj);

    res.json({
      success: true,
      data: {
        date: dateObj.toISOString(),
        formatted,
        locale: i18nService.getLocale()
      }
    });
  } catch (error) {
    logger.error('Format date error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to format date'
    });
  }
};

/**
 * Get validation messages for current locale
 * GET /api/i18n/validation
 */
exports.getValidationMessages = (req, res) => {
  try {
    const messages = i18nService.getValidationMessages();

    res.json({
      success: true,
      data: {
        locale: i18nService.getLocale(),
        messages
      }
    });
  } catch (error) {
    logger.error('Get validation messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get validation messages'
    });
  }
};