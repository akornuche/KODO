const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

/**
 * All report routes require authentication
 */
router.use(authenticateToken);

/**
 * Dashboard Statistics
 * GET /api/reports/dashboard
 * Returns quick stats based on user role
 */
router.get('/dashboard', reportController.getDashboardStats);

/**
 * Generate Sales Report
 * POST /api/reports/sales
 * Body: { startDate, endDate, format: 'pdf' | 'csv' | 'json', sellerId? }
 */
router.post('/sales', reportController.generateSalesReport);

/**
 * Generate Orders Report
 * POST /api/reports/orders
 * Body: { startDate, endDate, format: 'pdf' | 'csv' | 'json', status? }
 */
router.post('/orders', reportController.generateOrdersReport);

/**
 * Generate Delivery Report
 * POST /api/reports/deliveries
 * Body: { startDate, endDate, format: 'pdf' | 'csv' | 'json', courierId? }
 */
router.post('/deliveries', reportController.generateDeliveryReport);

/**
 * Generate User Activity Report (Admin only)
 * POST /api/reports/users
 * Body: { startDate, endDate, format: 'pdf' | 'csv' | 'json', role? }
 */
router.post('/users', requireRole('admin'), reportController.generateUserReport);

module.exports = router;
