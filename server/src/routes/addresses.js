const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const addressController = require('../controllers/addressController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/addresses
 * @desc    Get user addresses
 * @access  Private
 */
router.get('/', addressController.getAddresses);

/**
 * @route   GET /api/addresses/default
 * @desc    Get default address
 * @access  Private
 */
router.get('/default', addressController.getDefaultAddress);

/**
 * @route   GET /api/addresses/:id
 * @desc    Get address by ID
 * @access  Private
 */
router.get('/:id', addressController.getAddress);

/**
 * @route   POST /api/addresses
 * @desc    Create address
 * @access  Private
 */
router.post(
  '/',
  [
    body('label')
      .optional()
      .isIn(['home', 'work', 'other'])
      .withMessage('Label must be home, work, or other'),
    body('recipientName')
      .notEmpty()
      .withMessage('Recipient name is required')
      .isLength({ max: 100 })
      .withMessage('Recipient name must not exceed 100 characters'),
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    body('street')
      .notEmpty()
      .withMessage('Street address is required')
      .isLength({ max: 200 })
      .withMessage('Street address must not exceed 200 characters'),
    body('city')
      .notEmpty()
      .withMessage('City is required')
      .isLength({ max: 100 })
      .withMessage('City must not exceed 100 characters'),
    body('state')
      .notEmpty()
      .withMessage('State is required')
      .isLength({ max: 100 })
      .withMessage('State must not exceed 100 characters'),
    body('postalCode')
      .optional()
      .isLength({ max: 20 })
      .withMessage('Postal code must not exceed 20 characters'),
    body('country')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Country must not exceed 100 characters'),
    body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
    handleValidationErrors,
  ],
  addressController.createAddress
);

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update address
 * @access  Private
 */
router.put(
  '/:id',
  [
    body('label')
      .optional()
      .isIn(['home', 'work', 'other'])
      .withMessage('Label must be home, work, or other'),
    body('recipientName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Recipient name must not exceed 100 characters'),
    body('phoneNumber')
      .optional()
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('Invalid phone number format'),
    body('street')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Street address must not exceed 200 characters'),
    body('city')
      .optional()
      .isLength({ max: 100 })
      .withMessage('City must not exceed 100 characters'),
    body('state')
      .optional()
      .isLength({ max: 100 })
      .withMessage('State must not exceed 100 characters'),
    body('postalCode')
      .optional()
      .isLength({ max: 20 })
      .withMessage('Postal code must not exceed 20 characters'),
    body('country')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Country must not exceed 100 characters'),
    body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
    handleValidationErrors,
  ],
  addressController.updateAddress
);

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete('/:id', addressController.deleteAddress);

/**
 * @route   PUT /api/addresses/:id/set-default
 * @desc    Set default address
 * @access  Private
 */
router.put('/:id/set-default', addressController.setDefaultAddress);

module.exports = router;
