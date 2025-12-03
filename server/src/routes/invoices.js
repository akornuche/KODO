const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validateRequest');
const { authenticateToken } = require('../../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/invoices
 * @desc    Get invoices for user
 * @access  Private
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors,
  ],
  invoiceController.getInvoices
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private
 */
router.get('/:id', invoiceController.getInvoice);

/**
 * @route   POST /api/invoices/generate/:orderId
 * @desc    Generate invoice for order
 * @access  Private
 */
router.post('/generate/:orderId', invoiceController.generateInvoice);

/**
 * @route   GET /api/invoices/:id/download
 * @desc    Download invoice as PDF
 * @access  Private
 */
router.get('/:id/download', invoiceController.downloadInvoice);

/**
 * @route   POST /api/invoices/calculate-tax
 * @desc    Calculate tax estimate
 * @access  Private
 */
router.post(
  '/calculate-tax',
  [
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    handleValidationErrors,
  ],
  invoiceController.calculateTaxEstimate
);

module.exports = router;
