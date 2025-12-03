const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const sellerAnalyticsController = require('../controllers/sellerAnalyticsController');

/**
 * @route   GET /api/seller-analytics/dashboard
 * @desc    Get seller dashboard analytics
 * @access  Private (Seller)
 */
router.get(
  '/dashboard',
  authenticateToken,
  sellerAnalyticsController.getSellerDashboard
);

/**
 * @route   GET /api/seller-analytics/products
 * @desc    Get product performance metrics
 * @access  Private (Seller)
 */
router.get(
  '/products',
  authenticateToken,
  sellerAnalyticsController.getProductPerformance
);

/**
 * @route   GET /api/seller-analytics/sales-report
 * @desc    Get sales report
 * @access  Private (Seller)
 */
router.get(
  '/sales-report',
  authenticateToken,
  sellerAnalyticsController.getSalesReport
);

/**
 * @route   GET /api/seller-analytics/customers
 * @desc    Get customer insights
 * @access  Private (Seller)
 */
router.get(
  '/customers',
  authenticateToken,
  sellerAnalyticsController.getCustomerInsights
);

module.exports = router;
