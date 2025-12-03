const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// All analytics routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get('/dashboard', requireRole('admin'), analyticsController.getDashboard);
router.get('/export', requireRole('admin'), analyticsController.exportAnalytics);

// Routes available to sellers and admins
router.get('/sales', requireRole(['seller', 'admin']), analyticsController.getSalesAnalytics);
router.get('/products', requireRole(['seller', 'admin']), analyticsController.getProductAnalytics);

// Routes available to all authenticated users
router.get('/user-engagement', analyticsController.getUserEngagement);
router.get('/user-behavior', analyticsController.getUserBehaviorAnalytics);
router.get('/realtime', analyticsController.getRealtimeMetrics);

module.exports = router;