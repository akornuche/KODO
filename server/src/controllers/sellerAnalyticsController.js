const prisma = require('../../config/db');

/**
 * Get seller dashboard analytics
 * @route GET /api/seller-analytics/dashboard
 */
const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { period = '30' } = req.query; // days: 7, 30, 90, 365

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Total revenue
    const revenueData = await prisma.order.aggregate({
      where: {
        sellerId,
        status: { in: ['completed', 'delivered'] },
        createdAt: { gte: startDate },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Total products
    const totalProducts = await prisma.product.count({
      where: { sellerId, isActive: true },
    });

    // Total orders
    const totalOrders = revenueData._count;
    const totalRevenue = revenueData._sum.totalAmount || 0;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Product views (from recently viewed)
    const productViews = await prisma.recentlyViewed.count({
      where: {
        product: { sellerId },
        viewedAt: { gte: startDate },
      },
    });

    // Top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          sellerId,
          status: { in: ['completed', 'delivered'] },
          createdAt: { gte: startDate },
        },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    // Enrich top products with details
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, images: true, price: true },
        });
        return {
          ...product,
          quantitySold: item._sum.quantity,
          revenue: item._sum.price,
        };
      })
    );

    // Revenue by day (for chart)
    const revenueByDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("totalAmount") as revenue,
        COUNT(*) as orders
      FROM "Order"
      WHERE "sellerId" = ${sellerId}
        AND status IN ('completed', 'delivered')
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Customer satisfaction (average rating)
    const ratingsData = await prisma.review.aggregate({
      where: {
        product: { sellerId },
        createdAt: { gte: startDate },
      },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    const avgRating = ratingsData._avg.rating || 0;
    const totalReviews = ratingsData._count;

    // Pending orders
    const pendingOrders = await prisma.order.count({
      where: {
        sellerId,
        status: 'pending',
      },
    });

    // Low stock products
    const lowStockProducts = await prisma.product.count({
      where: {
        sellerId,
        isActive: true,
        stockQuantity: { lte: 10 },
      },
    });

    res.json({
      period: daysAgo,
      overview: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalProducts,
        productViews,
        avgRating,
        totalReviews,
        pendingOrders,
        lowStockProducts,
      },
      topProducts: topProductsWithDetails,
      revenueByDay,
    });
  } catch (error) {
    console.error('Get seller dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get product performance metrics
 * @route GET /api/seller-analytics/products
 */
const getProductPerformance = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page = 1, limit = 10, sortBy = 'revenue' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all products with sales data
    const products = await prisma.product.findMany({
      where: { sellerId },
      include: {
        orderItems: {
          where: {
            order: {
              status: { in: ['completed', 'delivered'] },
            },
          },
        },
        reviews: true,
        _count: {
          select: {
            recentlyViewed: true,
            favorites: true,
          },
        },
      },
      skip,
      take: parseInt(limit),
    });

    const productsWithMetrics = products.map(product => {
      const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        stockQuantity: product.stockQuantity,
        totalSold,
        totalRevenue,
        avgRating,
        reviewCount: product.reviews.length,
        views: product._count.recentlyViewed,
        favorites: product._count.favorites,
        conversionRate: product._count.recentlyViewed > 0
          ? (totalSold / product._count.recentlyViewed * 100).toFixed(2)
          : 0,
      };
    });

    // Sort by requested field
    const sortField = sortBy === 'revenue' ? 'totalRevenue' : sortBy === 'sold' ? 'totalSold' : 'views';
    productsWithMetrics.sort((a, b) => b[sortField] - a[sortField]);

    const total = await prisma.product.count({ where: { sellerId } });

    res.json({
      products: productsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get product performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get sales report
 * @route GET /api/seller-analytics/sales-report
 */
const getSalesReport = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get orders in date range
    const orders = await prisma.order.findMany({
      where: {
        sellerId,
        status: { in: ['completed', 'delivered'] },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    });

    // Group by time period
    const groupedData = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekNum = Math.floor((date - start) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          orders: 0,
          revenue: 0,
          itemsSold: 0,
        };
      }

      groupedData[key].orders += 1;
      groupedData[key].revenue += order.totalAmount;
      groupedData[key].itemsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    const reportData = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      startDate: start,
      endDate: end,
      groupBy,
      data: reportData,
      summary: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
        totalItems: orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
      },
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get customer insights
 * @route GET /api/seller-analytics/customers
 */
const getCustomerInsights = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Top customers by revenue
    const topCustomers = await prisma.order.groupBy({
      by: ['buyerId'],
      where: {
        sellerId,
        status: { in: ['completed', 'delivered'] },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: 10,
    });

    // Enrich with user details
    const customersWithDetails = await Promise.all(
      topCustomers.map(async (customer) => {
        const user = await prisma.user.findUnique({
          where: { id: customer.buyerId },
          select: { id: true, name: true, email: true },
        });
        return {
          ...user,
          totalSpent: customer._sum.totalAmount,
          orderCount: customer._count,
        };
      })
    );

    // Customer retention rate (repeat customers)
    const totalCustomers = await prisma.order.groupBy({
      by: ['buyerId'],
      where: {
        sellerId,
        status: { in: ['completed', 'delivered'] },
      },
      _count: true,
    });

    const repeatCustomers = totalCustomers.filter(c => c._count > 1).length;
    const retentionRate = totalCustomers.length > 0
      ? (repeatCustomers / totalCustomers.length * 100).toFixed(2)
      : 0;

    res.json({
      topCustomers: customersWithDetails,
      totalCustomers: totalCustomers.length,
      repeatCustomers,
      retentionRate: parseFloat(retentionRate),
    });
  } catch (error) {
    console.error('Get customer insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSellerDashboard,
  getProductPerformance,
  getSalesReport,
  getCustomerInsights,
};
