const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const returnController = require('../controllers/returnController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/returns
 * @desc    Get return requests for user
 * @access  Private
 */
router.get(
  '/',
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'APPROVED', 'REJECTED', 'SHIPPING', 'RECEIVED', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  returnController.getReturnRequests
);

/**
 * @route   GET /api/returns/:id
 * @desc    Get return request by ID
 * @access  Private
 */
router.get('/:id', returnController.getReturnRequest);

/**
 * @route   POST /api/returns
 * @desc    Create return request
 * @access  Private
 */
router.post(
  '/',
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('reason')
      .isIn(['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_ISSUE', 'CHANGED_MIND', 'OTHER'])
      .withMessage('Invalid return reason'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
    handleValidationErrors,
  ],
  returnController.createReturnRequest
);

/**
 * @route   PUT /api/returns/:id/cancel
 * @desc    Cancel return request
 * @access  Private
 */
router.put('/:id/cancel', returnController.cancelReturnRequest);

/**
 * @route   PUT /api/returns/:id/approve
 * @desc    Approve return request (Seller/Admin)
 * @access  Private (Seller/Admin)
 */
router.put(
  '/:id/approve',
  [
    body('refundAmount')
      .isFloat({ min: 0 })
      .withMessage('Refund amount must be a positive number'),
    body('shippingLabel')
      .optional()
      .isString()
      .withMessage('Shipping label must be a string'),
    handleValidationErrors,
  ],
  returnController.approveReturnRequest
);

/**
 * @route   PUT /api/returns/:id/reject
 * @desc    Reject return request (Seller/Admin)
 * @access  Private (Seller/Admin)
 */
router.put(
  '/:id/reject',
  [
    body('rejectionReason')
      .notEmpty()
      .withMessage('Rejection reason is required')
      .isLength({ max: 500 })
      .withMessage('Rejection reason must not exceed 500 characters'),
    handleValidationErrors,
  ],
  returnController.rejectReturnRequest
);

/**
 * @route   PUT /api/returns/:id/complete
 * @desc    Complete return and process refund (Seller/Admin)
 * @access  Private (Seller/Admin)
 */
router.put('/:id/complete', returnController.completeReturn);

module.exports = router;
