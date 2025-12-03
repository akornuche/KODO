const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { createLimiter } = require('../../middleware/rateLimiter');

// Validation rules
const createRequestValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('productId')
    .optional()
    .isUUID()
    .withMessage('ProductId must be a valid UUID'),
];

const submitOfferValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('productId')
    .notEmpty()
    .withMessage('ProductId is required')
    .isUUID()
    .withMessage('ProductId must be a valid UUID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['withdrawn', 'rejected'])
    .withMessage('Status must be withdrawn or rejected'),
];

// Routes

// Get all requests/bids (sellers view, but accessible to all authenticated users)
router.get(
  '/',
  authenticateToken,
  bidController.getAllRequests
);

// Get single request by ID
router.get(
  '/:id',
  authenticateToken,
  bidController.getRequestById
);

// Create new request (buyer only)
router.post(
  '/',
  authenticateToken,
  requireRole('buyer', 'admin'),
  createLimiter,
  createRequestValidation,
  handleValidationErrors,
  bidController.createRequest
);

// Seller submits offer to a request
router.post(
  '/:id/offers',
  authenticateToken,
  requireRole('seller', 'admin'),
  createLimiter,
  submitOfferValidation,
  handleValidationErrors,
  bidController.submitOffer
);

// Accept an offer (buyer accepts bid)
router.put(
  '/:id/accept',
  authenticateToken,
  requireRole('buyer', 'admin'),
  bidController.acceptOffer
);

// Update bid status (withdraw/reject)
router.put(
  '/:id/status',
  authenticateToken,
  updateStatusValidation,
  handleValidationErrors,
  bidController.updateBidStatus
);

// Search bids with advanced filtering (admin only)
router.get(
  '/admin/search',
  authenticateToken,
  requireRole('admin'),
  bidController.searchBids
);

module.exports = router;
