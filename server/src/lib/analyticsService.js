const prisma = require('./prisma');
const logger = require('./logger');
const kodoCache = require('./kodoCache');

/**
 * Advanced analytics service for KODO platform
 * Provides user behavior tracking, sales analytics, and business intelligence
 */
class AnalyticsService {
  constructor() {
    this.cache = kodoCache;
  }

  /**
   * Get user engagement metrics
   * @param {Object} filters - Date range and user filters
   * @returns {Object} User engagement analytics
   */
  async getUserEngagement(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        userId = null
      } = filters;

      // Try cache first
      const cacheKey = `user_engagement_${userId || 'all'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      const cached = await this.cache.getAnalytics('user_engagement', { userId, startDate, endDate });
      if (cached) return cached;

      const whereClause = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (userId) {
        whereClause.userId = userId;
      }

      // User registration trends
      const userRegistrations = await prisma.user.groupBy({
        by: ['createdAt'],
        where: whereClause,
        _count: true,
        orderBy: { createdAt: 'asc' }
      });

      // Daily active users
      const dailyActiveUsers = await prisma.user.findMany({
        where: {
          lastLoginAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          lastLoginAt: true
        }
      });

      // User activity by role
      const userActivityByRole = await prisma.user.groupBy({
        by: ['role'],
        where: whereClause,
        _count: true
      });

      // Session duration analysis (mock data - would need session tracking)
      const sessionMetrics = {
        averageSessionDuration: 0, // Would calculate from session logs
        totalSessions: 0,
        bounceRate: 0
      };

      const result = {
        period: { startDate, endDate },
        userRegistrations: userRegistrations.map(reg => ({
          date: reg.createdAt.toISOString().split('T')[0],
          count: reg._count
        })),
        dailyActiveUsers: this.aggregateDailyActivity(dailyActiveUsers, startDate, endDate),
        userActivityByRole,
        sessionMetrics,
        summary: {
          totalRegistrations: userRegistrations.reduce((sum, reg) => sum + reg._count, 0),
          totalActiveUsers: new Set(dailyActiveUsers.map(u => u.id)).size,
          averageRegistrationsPerDay: Math.round(userRegistrations.reduce((sum, reg) => sum + reg._count, 0) / 30)
        }
      };

      // Cache for 1 hour
      await this.cache.setAnalytics('user_engagement', { userId, startDate, endDate }, result, 3600);

      return result;
    } catch (error) {
      logger.error('User engagement analytics error:', error);
      throw new Error('Failed to get user engagement analytics');
    }
  }

  /**
   * Get sales and transaction analytics
   * @param {Object} filters - Date range and filters
   * @returns {Object} Sales analytics
   */
  async getSalesAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        category = null,
        sellerId = null
      } = filters;

      const cacheKey = `sales_${category || 'all'}_${sellerId || 'all'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      const cached = await this.cache.getAnalytics('sales', { category, sellerId, startDate, endDate });
      if (cached) return cached;

      const whereClause = {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed' // Only completed orders
      };

      if (sellerId) {
        whereClause.sellerId = sellerId;
      }

      // Sales by date
      const salesByDate = await prisma.order.groupBy({
        by: ['createdAt'],
        where: whereClause,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { createdAt: 'asc' }
      });

      // Sales by category
      const salesByCategory = await prisma.order.findMany({
        where: whereClause,
        include: {
          product: {
            select: { category: true }
          }
        }
      });

      const categorySales = {};
      salesByCategory.forEach(order => {
        const cat = order.product.category || 'uncategorized';
        categorySales[cat] = (categorySales[cat] || 0) + order.totalAmount;
      });

      // Top selling products
      const topProducts = await prisma.order.groupBy({
        by: ['productId'],
        where: whereClause,
        _sum: { totalAmount: true, quantity: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
        include: {
          product: {
            select: { title: true, category: true }
          }
        }
      });

      // Revenue by seller
      const revenueBySeller = await prisma.order.groupBy({
        by: ['sellerId'],
        where: whereClause,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
        include: {
          seller: {
            select: { username: true }
          }
        }
      });

      // Average order value
      const totalRevenue = salesByDate.reduce((sum, sale) => sum + (sale._sum.totalAmount || 0), 0);
      const totalOrders = salesByDate.reduce((sum, sale) => sum + sale._count, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const result = {
        period: { startDate, endDate },
        salesByDate: salesByDate.map(sale => ({
          date: sale.createdAt.toISOString().split('T')[0],
          revenue: sale._sum.totalAmount || 0,
          orders: sale._count
        })),
        salesByCategory: Object.entries(categorySales).map(([category, revenue]) => ({
          category,
          revenue
        })).sort((a, b) => b.revenue - a.revenue),
        topProducts: topProducts.map(product => ({
          productId: product.productId,
          title: product.product.title,
          category: product.product.category,
          totalRevenue: product._sum.totalAmount || 0,
          totalQuantity: product._sum.quantity || 0,
          orderCount: product._count
        })),
        revenueBySeller: revenueBySeller.map(seller => ({
          sellerId: seller.sellerId,
          username: seller.seller.username,
          revenue: seller._sum.totalAmount || 0,
          orders: seller._count
        })),
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          uniqueCustomers: new Set(salesByCategory.map(o => o.buyerId)).size
        }
      };

      await this.cache.setAnalytics('sales', { category, sellerId, startDate, endDate }, result, 3600);

      return result;
    } catch (error) {
      logger.error('Sales analytics error:', error);
      throw new Error('Failed to get sales analytics');
    }
  }

  /**
   * Get product performance analytics
   * @param {Object} filters - Date range and product filters
   * @returns {Object} Product performance analytics
   */
  async getProductAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        category = null,
        limit = 20
      } = filters;

      const cacheKey = `products_${category || 'all'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      const cached = await this.cache.getAnalytics('products', { category, startDate, endDate, limit });
      if (cached) return cached;

      const whereClause = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (category) {
        whereClause.category = category;
      }

      // Product views (mock - would need view tracking)
      const productViews = await prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          category: true,
          price: true,
          createdAt: true,
          _count: {
            select: { bids: true, orders: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      // Product conversion rates
      const productPerformance = productViews.map(product => {
        const totalInteractions = product._count.bids + product._count.orders;
        const conversionRate = totalInteractions > 0 ? (product._count.orders / totalInteractions) * 100 : 0;

        return {
          productId: product.id,
          title: product.title,
          category: product.category,
          price: product.price,
          age: Math.floor((Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // days
          bids: product._count.bids,
          orders: product._count.orders,
          conversionRate: Math.round(conversionRate * 100) / 100,
          totalInteractions
        };
      });

      // Category performance
      const categoryPerformance = await prisma.product.groupBy({
        by: ['category'],
        where: whereClause,
        _count: true,
        _avg: { price: true }
      });

      const categoryStats = await Promise.all(
        categoryPerformance.map(async (cat) => {
          const categoryOrders = await prisma.order.count({
            where: {
              product: { category: cat.category },
              createdAt: { gte: startDate, lte: endDate },
              status: 'completed'
            }
          });

          return {
            category: cat.category,
            productCount: cat._count,
            averagePrice: Math.round((cat._avg.price || 0) * 100) / 100,
            totalOrders: categoryOrders,
            conversionRate: cat._count > 0 ? Math.round((categoryOrders / cat._count) * 10000) / 100 : 0
          };
        })
      );

      const result = {
        period: { startDate, endDate },
        productPerformance: productPerformance.sort((a, b) => b.conversionRate - a.conversionRate),
        categoryPerformance: categoryStats.sort((a, b) => b.conversionRate - a.conversionRate),
        summary: {
          totalProducts: productViews.length,
          averageConversionRate: productPerformance.length > 0
            ? Math.round((productPerformance.reduce((sum, p) => sum + p.conversionRate, 0) / productPerformance.length) * 100) / 100
            : 0,
          topPerformingCategory: categoryStats[0]?.category || null
        }
      };

      await this.cache.setAnalytics('products', { category, startDate, endDate, limit }, result, 3600);

      return result;
    } catch (error) {
      logger.error('Product analytics error:', error);
      throw new Error('Failed to get product analytics');
    }
  }

  /**
   * Get user behavior analytics
   * @param {Object} filters - Date range and user filters
   * @returns {Object} User behavior analytics
   */
  async getUserBehaviorAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        userId = null
      } = filters;

      const cacheKey = `user_behavior_${userId || 'all'}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
      const cached = await this.cache.getAnalytics('user_behavior', { userId, startDate, endDate });
      if (cached) return cached;

      const whereClause = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };

      if (userId) {
        whereClause.userId = userId;
      }

      // User activity patterns
      const userActivity = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              products: true,
              bids: true,
              orders: true,
              reviews: true
            }
          }
        }
      });

      // Activity by hour of day
      const activityByHour = await this.getActivityByHour(startDate, endDate, userId);

      // User segmentation
      const userSegments = {
        buyers: userActivity.filter(u => u._count.orders > 0).length,
        sellers: userActivity.filter(u => u._count.products > 0).length,
        active: userActivity.filter(u => u.lastLoginAt &&
          (new Date(u.lastLoginAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))).length,
        new: userActivity.filter(u => new Date(u.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
      };

      // User engagement scores
      const userEngagement = userActivity.map(user => {
        const daysSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const activityScore = (user._count.products * 2) + (user._count.bids * 1.5) + (user._count.orders * 3) + (user._count.reviews * 1);
        const engagementRate = daysSinceRegistration > 0 ? activityScore / daysSinceRegistration : activityScore;

        return {
          userId: user.id,
          role: user.role,
          registrationDate: user.createdAt,
          lastLogin: user.lastLoginAt,
          activityScore: Math.round(activityScore * 100) / 100,
          engagementRate: Math.round(engagementRate * 100) / 100,
          productsListed: user._count.products,
          bidsPlaced: user._count.bids,
          ordersMade: user._count.orders,
          reviewsWritten: user._count.reviews
        };
      }).sort((a, b) => b.engagementRate - a.engagementRate);

      const result = {
        period: { startDate, endDate },
        userSegments,
        activityByHour,
        topEngagedUsers: userEngagement.slice(0, 10),
        engagementDistribution: this.calculateEngagementDistribution(userEngagement),
        summary: {
          totalUsers: userActivity.length,
          averageEngagementRate: userEngagement.length > 0
            ? Math.round((userEngagement.reduce((sum, u) => sum + u.engagementRate, 0) / userEngagement.length) * 100) / 100
            : 0,
          mostActiveHour: activityByHour.reduce((max, hour) => hour.count > max.count ? hour : max, { hour: 0, count: 0 }).hour
        }
      };

      await this.cache.setAnalytics('user_behavior', { userId, startDate, endDate }, result, 3600);

      return result;
    } catch (error) {
      logger.error('User behavior analytics error:', error);
      throw new Error('Failed to get user behavior analytics');
    }
  }

  /**
   * Get real-time dashboard metrics
   * @returns {Object} Real-time metrics
   */
  async getRealtimeMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Active users in last hour
      const activeUsers = await prisma.user.count({
        where: {
          lastLoginAt: { gte: oneHourAgo }
        }
      });

      // Recent orders
      const recentOrders = await prisma.order.count({
        where: {
          createdAt: { gte: oneHourAgo },
          status: 'completed'
        }
      });

      // Revenue in last 24 hours
      const recentRevenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: oneDayAgo },
          status: 'completed'
        },
        _sum: { totalAmount: true }
      });

      // System health (mock data)
      const systemHealth = {
        database: 'healthy',
        cache: this.cache.cacheManager.isConnected ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      };

      return {
        timestamp: now.toISOString(),
        activeUsers,
        recentOrders,
        recentRevenue: recentRevenue._sum.totalAmount || 0,
        systemHealth,
        alerts: [] // Would contain system alerts
      };
    } catch (error) {
      logger.error('Realtime metrics error:', error);
      throw new Error('Failed to get realtime metrics');
    }
  }

  /**
   * Helper method to aggregate daily activity
   */
  aggregateDailyActivity(users, startDate, endDate) {
    const dailyActivity = {};
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Initialize all dates
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      dailyActivity[dateStr] = 0;
    }

    // Count users per day
    users.forEach(user => {
      if (user.lastLoginAt) {
        const dateStr = user.lastLoginAt.toISOString().split('T')[0];
        if (dailyActivity.hasOwnProperty(dateStr)) {
          dailyActivity[dateStr]++;
        }
      }
    });

    return Object.entries(dailyActivity).map(([date, count]) => ({ date, activeUsers: count }));
  }

  /**
   * Helper method to get activity by hour
   */
  async getActivityByHour(startDate, endDate, userId = null) {
    // This would typically query session logs or audit logs
    // For now, return mock data based on order patterns
    const hourData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(userId && { userId })
        },
        select: { createdAt: true }
      });

      orders.forEach(order => {
        const hour = order.createdAt.getHours();
        hourData[hour].count++;
      });

      return hourData;
    } catch (error) {
      logger.error('Activity by hour error:', error);
      return hourData;
    }
  }

  /**
   * Helper method to calculate engagement distribution
   */
  calculateEngagementDistribution(users) {
    const distribution = {
      high: 0,    // > 2.0
      medium: 0,  // 1.0 - 2.0
      low: 0     // < 1.0
    };

    users.forEach(user => {
      if (user.engagementRate > 2.0) distribution.high++;
      else if (user.engagementRate >= 1.0) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  /**
   * Export analytics data for external analysis
   * @param {Object} filters - Export filters
   * @returns {Object} Export data
   */
  async exportAnalytics(filters = {}) {
    try {
      const [userEngagement, salesAnalytics, productAnalytics] = await Promise.all([
        this.getUserEngagement(filters),
        this.getSalesAnalytics(filters),
        this.getProductAnalytics(filters)
      ]);

      return {
        exportDate: new Date().toISOString(),
        period: filters,
        data: {
          userEngagement,
          salesAnalytics,
          productAnalytics
        },
        metadata: {
          totalRecords: userEngagement.summary.totalRegistrations +
                       salesAnalytics.summary.totalOrders +
                       productAnalytics.summary.totalProducts
        }
      };
    } catch (error) {
      logger.error('Analytics export error:', error);
      throw new Error('Failed to export analytics data');
    }
  }
}

module.exports = new AnalyticsService();