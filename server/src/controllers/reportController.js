const prisma = require('../lib/prisma');
const reportGenerator = require('../lib/reportGenerator');
const logger = require('../lib/logger');

/**
 * Report Controller
 * Handles report generation for sales, orders, deliveries, and users
 */

/**
 * Generate Sales Report
 * POST /api/reports/sales
 */
exports.generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'pdf', sellerId } = req.body;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: true,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        error: true,
        message: 'Start date must be before end date',
      });
    }

    // Build query filters
    const where = {
      createdAt: {
        gte: start,
        lte: end,
      },
      status: {
        in: ['completed', 'delivered'],
      },
    };

    // If user is seller, only show their sales
    // If admin requesting specific seller, filter by sellerId
    if (req.user.role === 'seller') {
      where.sellerId = req.user.id;
    } else if (sellerId && req.user.role === 'admin') {
      where.sellerId = sellerId;
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        seller: {
          select: {
            id: true,
            businessName: true,
            username: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary statistics
    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      averageOrderValue: orders.length > 0 
        ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length 
        : 0,
      totalPlatformFee: orders.reduce((sum, order) => sum + (order.platformFee || 0), 0),
      totalDeliveryFee: orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0),
    };

    // Transform data for report
    const reportData = {
      title: 'Sales Report',
      period: {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
      },
      summary,
      orders: orders.map(order => ({
        orderId: order.id,
        date: order.createdAt.toLocaleDateString(),
        buyer: order.buyer.username,
        seller: order.seller.businessName || order.seller.username,
        product: order.product?.title || 'N/A',
        quantity: order.quantity,
        amount: order.totalAmount,
        platformFee: order.platformFee || 0,
        deliveryFee: order.deliveryFee || 0,
        status: order.status,
      })),
    };

    // Generate report based on format
    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generatePDF(reportData, { type: 'sales', title: 'Sales Report' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvContent = await reportGenerator.generateCSV(reportData, { type: 'sales' });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        error: false,
        report: reportData,
      });
    }
  } catch (error) {
    logger.error('Generate sales report error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate sales report',
    });
  }
};

/**
 * Generate Orders Report
 * POST /api/reports/orders
 */
exports.generateOrdersReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'pdf', status } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: true,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const where = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // User-specific filters
    if (req.user.role === 'seller') {
      where.sellerId = req.user.id;
    } else if (req.user.role === 'buyer') {
      where.buyerId = req.user.id;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        buyer: {
          select: {
            username: true,
            email: true,
          },
        },
        seller: {
          select: {
            businessName: true,
            username: true,
          },
        },
        product: {
          select: {
            title: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by status
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const summary = {
      totalOrders: orders.length,
      statusBreakdown: statusCounts,
      totalValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    };

    const reportData = {
      title: 'Orders Report',
      period: {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
      },
      summary,
      orders: orders.map(order => ({
        orderId: order.id,
        date: order.createdAt.toLocaleDateString(),
        buyer: order.buyer.username,
        seller: order.seller.businessName || order.seller.username,
        product: order.product?.title || 'N/A',
        amount: order.totalAmount,
        status: order.status,
      })),
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generatePDF(reportData, { type: 'orders', title: 'Orders Report' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvContent = await reportGenerator.generateCSV(reportData, { type: 'orders' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-report-${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      res.json({ error: false, report: reportData });
    }
  } catch (error) {
    logger.error('Generate orders report error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate orders report',
    });
  }
};

/**
 * Generate Delivery Report
 * POST /api/reports/deliveries
 */
exports.generateDeliveryReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'pdf', courierId } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: true,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const where = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    // Filter by courier
    if (req.user.role === 'courier') {
      where.courierId = req.user.id;
    } else if (courierId && req.user.role === 'admin') {
      where.courierId = courierId;
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          include: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
        courier: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Status breakdown
    const statusCounts = deliveries.reduce((acc, delivery) => {
      acc[delivery.status] = (acc[delivery.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion rate
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const completionRate = deliveries.length > 0 
      ? (completedDeliveries / deliveries.length) * 100 
      : 0;

    // Calculate average delivery time
    const deliveriesWithTimes = deliveries.filter(d => 
      d.status === 'delivered' && d.deliveredAt && d.pickedUpAt
    );
    const averageDeliveryTime = deliveriesWithTimes.length > 0
      ? deliveriesWithTimes.reduce((sum, d) => {
          const duration = (new Date(d.deliveredAt) - new Date(d.pickedUpAt)) / (1000 * 60); // minutes
          return sum + duration;
        }, 0) / deliveriesWithTimes.length
      : 0;

    const summary = {
      totalDeliveries: deliveries.length,
      statusBreakdown: statusCounts,
      completionRate: completionRate.toFixed(2) + '%',
      averageDeliveryTime: averageDeliveryTime.toFixed(0) + ' minutes',
      totalDeliveryFees: deliveries.reduce((sum, d) => sum + (d.deliveryFee || 0), 0),
    };

    const reportData = {
      title: 'Delivery Report',
      period: {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
      },
      summary,
      deliveries: deliveries.map(delivery => ({
        deliveryId: delivery.id,
        orderId: delivery.orderId,
        date: delivery.createdAt.toLocaleDateString(),
        courier: delivery.courier 
          ? `${delivery.courier.firstName || ''} ${delivery.courier.lastName || ''}`.trim() || delivery.courier.username
          : 'Unassigned',
        product: delivery.order?.product?.title || 'N/A',
        pickupLocation: delivery.pickupAddress?.split(',')[0] || 'N/A',
        dropoffLocation: delivery.dropoffAddress?.split(',')[0] || 'N/A',
        distance: delivery.distance ? delivery.distance.toFixed(2) + ' km' : 'N/A',
        deliveryFee: delivery.deliveryFee || 0,
        status: delivery.status,
      })),
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generatePDF(reportData, { type: 'deliveries', title: 'Delivery Report' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=delivery-report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvContent = await reportGenerator.generateCSV(reportData, { type: 'deliveries' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=delivery-report-${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      res.json({ error: false, report: reportData });
    }
  } catch (error) {
    logger.error('Generate delivery report error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate delivery report',
    });
  }
};

/**
 * Generate User Activity Report (Admin only)
 * POST /api/reports/users
 */
exports.generateUserReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'pdf', role } = req.body;

    // Only admins can generate user reports
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Only administrators can generate user reports',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: true,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const where = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        sellerOnboarded: true,
        buyerOnboarded: true,
        courierOnboarded: true,
        sellerNiche: true,
        courierRating: true,
        completedDeliveries: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Role breakdown
    const roleBreakdown = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    // Onboarding status
    const onboardingStatus = {
      sellers: users.filter(u => u.role === 'seller' && u.sellerOnboarded).length,
      buyers: users.filter(u => u.role === 'buyer' && u.buyerOnboarded).length,
      couriers: users.filter(u => u.role === 'courier' && u.courierOnboarded).length,
    };

    const summary = {
      totalUsers: users.length,
      roleBreakdown,
      onboardingStatus,
      totalSellers: users.filter(u => u.role === 'seller').length,
      totalBuyers: users.filter(u => u.role === 'buyer').length,
      totalCouriers: users.filter(u => u.role === 'courier').length,
    };

    const reportData = {
      title: 'User Activity Report',
      period: {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString(),
      },
      summary,
      users: users.map(user => ({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        registrationDate: user.createdAt.toLocaleDateString(),
        onboarded: user.role === 'seller' 
          ? user.sellerOnboarded 
          : user.role === 'buyer'
          ? user.buyerOnboarded
          : user.role === 'courier'
          ? user.courierOnboarded
          : false,
        niche: user.sellerNiche || '-',
        courierRating: user.role === 'courier' ? user.courierRating : '-',
        completedDeliveries: user.role === 'courier' ? user.completedDeliveries : '-',
      })),
    };

    if (format === 'pdf') {
      const pdfBuffer = await reportGenerator.generatePDF(reportData, { type: 'users', title: 'User Activity Report' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=user-report-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvContent = await reportGenerator.generateCSV(reportData, { type: 'users' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=user-report-${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      res.json({ error: false, report: reportData });
    }
  } catch (error) {
    logger.error('Generate user report error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate user report',
    });
  }
};

/**
 * Get Dashboard Statistics (Quick summary)
 * GET /api/reports/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    let stats = {};

    if (req.user.role === 'admin') {
      // Admin sees everything
      const [totalUsers, totalOrders, totalDeliveries, totalRevenue] = await Promise.all([
        prisma.user.count(),
        prisma.order.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        prisma.delivery.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: startDate },
            status: { in: ['completed', 'delivered'] },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      stats = {
        totalUsers,
        ordersThisPeriod: totalOrders,
        deliveriesThisPeriod: totalDeliveries,
        revenueThisPeriod: totalRevenue._sum.totalAmount || 0,
        period: `Last ${period} days`,
      };
    } else if (req.user.role === 'seller') {
      // Seller sees their sales
      const [totalOrders, totalRevenue, totalProducts] = await Promise.all([
        prisma.order.count({
          where: {
            sellerId: req.user.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.order.aggregate({
          where: {
            sellerId: req.user.id,
            createdAt: { gte: startDate },
            status: { in: ['completed', 'delivered'] },
          },
          _sum: {
            totalAmount: true,
          },
        }),
        prisma.product.count({
          where: {
            sellerId: req.user.id,
          },
        }),
      ]);

      stats = {
        totalProducts,
        ordersThisPeriod: totalOrders,
        revenueThisPeriod: totalRevenue._sum.totalAmount || 0,
        period: `Last ${period} days`,
      };
    } else if (req.user.role === 'courier') {
      // Courier sees their deliveries
      const [totalDeliveries, completedDeliveries, totalEarnings] = await Promise.all([
        prisma.delivery.count({
          where: {
            courierId: req.user.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.delivery.count({
          where: {
            courierId: req.user.id,
            status: 'delivered',
            createdAt: { gte: startDate },
          },
        }),
        prisma.delivery.aggregate({
          where: {
            courierId: req.user.id,
            status: 'delivered',
            createdAt: { gte: startDate },
          },
          _sum: {
            courierEarnings: true,
          },
        }),
      ]);

      stats = {
        deliveriesThisPeriod: totalDeliveries,
        completedDeliveries,
        earningsThisPeriod: totalEarnings._sum.courierEarnings || 0,
        period: `Last ${period} days`,
      };
    } else if (req.user.role === 'buyer') {
      // Buyer sees their orders
      const totalOrders = await prisma.order.count({
        where: {
          buyerId: req.user.id,
          createdAt: { gte: startDate },
        },
      });

      const totalSpent = await prisma.order.aggregate({
        where: {
          buyerId: req.user.id,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalAmount: true,
        },
      });

      stats = {
        ordersThisPeriod: totalOrders,
        totalSpent: totalSpent._sum.totalAmount || 0,
        period: `Last ${period} days`,
      };
    }

    res.json({
      error: false,
      stats,
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch dashboard statistics',
    });
  }
};
