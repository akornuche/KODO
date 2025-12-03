const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const gdprController = require('../controllers/gdprController');

/**
 * @route   GET /api/gdpr/export-data
 * @desc    Export user data (GDPR)
 * @access  Private
 */
router.get(
  '/export-data',
  authenticateToken,
  gdprController.exportUserData
);

/**
 * @route   GET /api/gdpr/download-export/:fileName
 * @desc    Download exported data
 * @access  Private
 */
router.get(
  '/download-export/:fileName',
  authenticateToken,
  gdprController.downloadExport
);

/**
 * @route   DELETE /api/gdpr/delete-account
 * @desc    Delete user account (GDPR)
 * @access  Private
 */
router.delete(
  '/delete-account',
  authenticateToken,
  [
    body('confirmation').equals('DELETE').withMessage('Confirmation required'),
    handleValidationErrors,
  ],
  gdprController.deleteUserAccount
);

/**
 * @route   GET /api/gdpr/consent
 * @desc    Get consent preferences
 * @access  Private
 */
router.get(
  '/consent',
  authenticateToken,
  gdprController.getConsent
);

/**
 * @route   PUT /api/gdpr/consent
 * @desc    Update consent preferences
 * @access  Private
 */
router.put(
  '/consent',
  authenticateToken,
  gdprController.updateConsent
);

/**
 * @route   GET /api/gdpr/privacy-acceptance
 * @desc    Get privacy policy acceptance
 * @access  Private
 */
router.get(
  '/privacy-acceptance',
  authenticateToken,
  gdprController.getPrivacyAcceptance
);

/**
 * @route   POST /api/gdpr/rectify
 * @desc    Request data rectification
 * @access  Private
 */
router.post(
  '/rectify',
  authenticateToken,
  [
    body('field').notEmpty().withMessage('Field is required'),
    body('newValue').notEmpty().withMessage('New value is required'),
    handleValidationErrors,
  ],
  gdprController.rectifyData
);

module.exports = router;
