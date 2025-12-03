const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const socialController = require('../controllers/socialController');

const router = express.Router();

// All social routes require authentication
router.use(authenticateToken);

/**
 * Validation rules
 */
const updateProfileValidation = [
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be 100 characters or less'),
  body('website')
    .optional()
    .isString()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('socialLinks')
    .optional()
    .isObject()
    .withMessage('Social links must be an object'),
];

const userIdValidation = [
  param('userId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('User ID is required'),
];

/**
 * Routes
 */

// Get user profile
router.get(
  '/profile/:userId',
  userIdValidation,
  handleValidationErrors,
  socialController.getUserProfile
);

// Update own profile
router.put(
  '/profile',
  updateProfileValidation,
  handleValidationErrors,
  socialController.updateProfile
);

// Follow a user
router.post(
  '/follow/:userId',
  userIdValidation,
  handleValidationErrors,
  socialController.followUser
);

// Unfollow a user
router.delete(
  '/follow/:userId',
  userIdValidation,
  handleValidationErrors,
  socialController.unfollowUser
);

// Get followers list
router.get(
  '/followers/:userId',
  userIdValidation,
  handleValidationErrors,
  socialController.getFollowers
);

// Get following list
router.get(
  '/following/:userId',
  userIdValidation,
  handleValidationErrors,
  socialController.getFollowing
);

// Get activity feed
router.get(
  '/feed',
  socialController.getActivityFeed
);

module.exports = router;
