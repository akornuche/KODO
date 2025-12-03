const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const supportController = require('../controllers/supportController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/support/tickets
 * @desc    Get support tickets for user
 * @access  Private
 */
router.get(
  '/tickets',
  [
    query('status')
      .optional()
      .isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
      .withMessage('Invalid status'),
    query('category')
      .optional()
      .isIn(['ORDER', 'PAYMENT', 'PRODUCT', 'ACCOUNT', 'TECHNICAL', 'OTHER'])
      .withMessage('Invalid category'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  supportController.getTickets
);

/**
 * @route   GET /api/support/tickets/:id
 * @desc    Get ticket by ID
 * @access  Private
 */
router.get('/tickets/:id', supportController.getTicket);

/**
 * @route   POST /api/support/tickets
 * @desc    Create support ticket
 * @access  Private
 */
router.post(
  '/tickets',
  [
    body('subject')
      .notEmpty()
      .withMessage('Subject is required')
      .isLength({ max: 200 })
      .withMessage('Subject must not exceed 200 characters'),
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters'),
    body('category')
      .isIn(['ORDER', 'PAYMENT', 'PRODUCT', 'ACCOUNT', 'TECHNICAL', 'OTHER'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
      .withMessage('Invalid priority'),
    body('orderId').optional().isString().withMessage('Order ID must be a string'),
    body('attachments').optional().isArray().withMessage('Attachments must be an array'),
    handleValidationErrors,
  ],
  supportController.createTicket
);

/**
 * @route   POST /api/support/tickets/:id/reply
 * @desc    Add reply to ticket
 * @access  Private
 */
router.post(
  '/tickets/:id/reply',
  [
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 2000 })
      .withMessage('Message must not exceed 2000 characters'),
    body('attachments').optional().isArray().withMessage('Attachments must be an array'),
    handleValidationErrors,
  ],
  supportController.addReply
);

/**
 * @route   PUT /api/support/tickets/:id/close
 * @desc    Close ticket
 * @access  Private
 */
router.put('/tickets/:id/close', supportController.closeTicket);

/**
 * @route   PUT /api/support/tickets/:id/reopen
 * @desc    Reopen ticket
 * @access  Private
 */
router.put('/tickets/:id/reopen', supportController.reopenTicket);

/**
 * @route   PUT /api/support/tickets/:id/assign
 * @desc    Assign ticket to agent (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/tickets/:id/assign',
  [
    body('assignedToId').notEmpty().withMessage('Assigned to ID is required'),
    handleValidationErrors,
  ],
  supportController.assignTicket
);

module.exports = router;
