const express = require('express');
const router = express.Router();
const i18nController = require('../controllers/i18nController');
const { authenticateToken } = require('../../middleware/auth');

// Public routes
router.get('/locales', i18nController.getSupportedLocales);
router.get('/translations', i18nController.getTranslations);
router.post('/detect', i18nController.detectLocale);
router.get('/format/currency', i18nController.formatCurrency);
router.get('/format/date', i18nController.formatDate);
router.get('/validation', i18nController.getValidationMessages);

// Protected routes (require authentication)
router.get('/locale', authenticateToken, i18nController.getLocale);
router.post('/locale', authenticateToken, i18nController.setLocale);

module.exports = router;