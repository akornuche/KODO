const analyticsService = require('../lib/analyticsService');
const logger = require('../lib/logger');

/**
 * Analytics controller for dashboard and reporting
 */

/**
 * Get user engagement analytics
 * GET /api/analytics/user-engagement?startDate=2024-01-01&endDate=2024-01-31&userId=123
 */
exports.getUserEngagement = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (userId) filters.userId = userId;

    const analytics = await analyticsService.getUserEngagement(filters);

    logger.info('User engagement analytics retrieved', {
      requestId: req.id,
      userId: req.user?.id,
      filters
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get user engagement analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user engagement analytics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Get sales analytics
 * GET /api/analytics/sales?startDate=2024-01-01&endDate=2024-01-31&category=electronics&sellerId=123
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, category, sellerId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (category) filters.category = category;
    if (sellerId) filters.sellerId = sellerId;

    const analytics = await analyticsService.getSalesAnalytics(filters);

    logger.info('Sales analytics retrieved', {
      requestId: req.id,
      userId: req.user?.id,
      filters
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get sales analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sales analytics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Get product performance analytics
 * GET /api/analytics/products?startDate=2024-01-01&endDate=2024-01-31&category=electronics&limit=20
 */
exports.getProductAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, category, limit } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (category) filters.category = category;
    if (limit) filters.limit = parseInt(limit);

    const analytics = await analyticsService.getProductAnalytics(filters);

    logger.info('Product analytics retrieved', {
      requestId: req.id,
      userId: req.user?.id,
      filters
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get product analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve product analytics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Get user behavior analytics
 * GET /api/analytics/user-behavior?startDate=2024-01-01&endDate=2024-01-31&userId=123
 */
exports.getUserBehaviorAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (userId) filters.userId = userId;

    const analytics = await analyticsService.getUserBehaviorAnalytics(filters);

    logger.info('User behavior analytics retrieved', {
      requestId: req.id,
      userId: req.user?.id,
      filters
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get user behavior analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user behavior analytics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Get real-time dashboard metrics
 * GET /api/analytics/realtime
 */
exports.getRealtimeMetrics = async (req, res) => {
  try {
    const metrics = await analyticsService.getRealtimeMetrics();

    logger.info('Realtime metrics retrieved', {
      requestId: req.id,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Get realtime metrics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve realtime metrics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Get comprehensive dashboard data
 * GET /api/analytics/dashboard?period=30d
 */
exports.getDashboard = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Parse period
    const days = period.endsWith('d') ? parseInt(period.slice(0, -1)) : 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const filters = { startDate, endDate };

    // Get all analytics in parallel
    const [userEngagement, salesAnalytics, productAnalytics, userBehavior, realtime] = await Promise.all([
      analyticsService.getUserEngagement(filters),
      analyticsService.getSalesAnalytics(filters),
      analyticsService.getProductAnalytics(filters),
      analyticsService.getUserBehaviorAnalytics(filters),
      analyticsService.getRealtimeMetrics()
    ]);

    const dashboard = {
      period: { startDate, endDate, days },
      summary: {
        totalUsers: userEngagement.summary.totalActiveUsers,
        totalRevenue: salesAnalytics.summary.totalRevenue,
        totalOrders: salesAnalytics.summary.totalOrders,
        averageOrderValue: salesAnalytics.summary.averageOrderValue,
        activeUsers: realtime.activeUsers,
        recentOrders: realtime.recentOrders,
        recentRevenue: realtime.recentRevenue
      },
      charts: {
        userRegistrations: userEngagement.userRegistrations,
        salesByDate: salesAnalytics.salesByDate,
        dailyActiveUsers: userEngagement.dailyActiveUsers,
        activityByHour: userBehavior.activityByHour
      },
      topPerformers: {
        products: productAnalytics.productPerformance.slice(0, 5),
        sellers: salesAnalytics.revenueBySeller.slice(0, 5),
        categories: salesAnalytics.salesByCategory.slice(0, 5)
      },
      userSegments: userBehavior.userSegments,
      systemHealth: realtime.systemHealth
    };

    logger.info('Dashboard analytics retrieved', {
      requestId: req.id,
      userId: req.user?.id,
      period
    });

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Get dashboard analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard analytics',
      code: 'ANALYTICS_ERROR',
      requestId: req.id
    });
  }
};

/**
 * Export analytics data
 * GET /api/analytics/export?startDate=2024-01-01&endDate=2024-01-31&format=json
 */
exports.exportAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const exportData = await analyticsService.exportAnalytics(filters);

    logger.info('Analytics data exported', {
      requestId: req.id,
      userId: req.user?.id,
      format,
      filters
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="kodo_analytics_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } else {
      // For other formats, return JSON for now
      res.json({
        success: true,
        data: exportData,
        message: `Export format '${format}' not yet implemented, returning JSON`
      });
    }
  } catch (error) {
    logger.error('Export analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      code: 'EXPORT_ERROR',
      requestId: req.id
    });
  }
};