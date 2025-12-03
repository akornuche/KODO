const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { sendEmail, templates } = require('../lib/email');
const { broadcastOrderUpdate } = require('../lib/socket');

/**
 * Get all users (admin only) with enhanced search and filtering
 * GET /api/admin/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const {
      role = '',
      search = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom = '',
      dateTo = '',
      hasActivity = '', // 'true' for users with orders/bids, 'false' for inactive
      emailVerified = '', // 'true'/'false' for email verification status (future feature)
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (role) {
      const validRoles = ['buyer', 'seller', 'courier', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: true,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
          requestId: req.id,
        });
      }
      where.role = role;
    }

    // Enhanced search across multiple fields
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Activity filter
    if (hasActivity === 'true') {
      where.OR = [
        { orders: { some: {} } },
        { bids: { some: {} } },
        { products: { some: {} } },
        { deliveries: { some: {} } },
      ];
    } else if (hasActivity === 'false') {
      where.AND = [
        { orders: { none: {} } },
        { bids: { none: {} } },
        { products: { none: {} } },
        { deliveries: { none: {} } },
      ];
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt', 'username', 'email', 'role'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get users with pagination and enhanced includes
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          stripeAccountId: true,
          lastKnownLat: true,
          lastKnownLng: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              products: true,
              bids: true,
              orders: true,
              deliveries: true,
            },
          },
        },
        orderBy: { [orderByField]: orderDirection },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    // Get user analytics
    const userAnalytics = await getUserAnalytics(where);

    logger.info('Admin retrieved users with enhanced search', {
      requestId: req.id,
      adminId: req.user.id,
      count: users.length,
      total,
      search,
      filters: { role, dateFrom, dateTo, hasActivity },
    });

    res.json({
      users,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + users.length < total,
      },
      analytics: userAnalytics,
      appliedFilters: {
        role: role || null,
        search: search || null,
        dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
        hasActivity: hasActivity ? hasActivity === 'true' : null,
      },
    });
  } catch (error) {
    logger.error('Get all users error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve users',
      code: 'GET_USERS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get platform statistics
 * GET /api/admin/stats
 */
exports.getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalBids,
      totalOrders,
      totalDeliveries,
      usersByRole,
      ordersByStatus,
      deliveriesByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.bid.count(),
      prisma.order.count(),
      prisma.delivery.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.delivery.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Calculate total revenue (sum of all paid orders)
    const revenueData = await prisma.order.aggregate({
      where: {
        status: {
          in: ['paid', 'shipped', 'completed'],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const stats = {
      overview: {
        totalUsers,
        totalProducts,
        totalBids,
        totalOrders,
        totalDeliveries,
        totalRevenue: revenueData._sum.totalAmount || 0,
      },
      users: {
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count;
          return acc;
        }, {}),
      },
      orders: {
        byStatus: ordersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
      },
      deliveries: {
        byStatus: deliveriesByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
      },
    };

    logger.info('Admin retrieved platform stats', {
      requestId: req.id,
      adminId: req.user.id,
    });

    res.json({ stats });
  } catch (error) {
    logger.error('Get platform stats error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve platform statistics',
      code: 'GET_STATS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get analytics data
 * GET /api/admin/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get orders data for the period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // Get new users for the period
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Get deliveries completed in period
    const completedDeliveries = await prisma.delivery.count({
      where: {
        status: 'delivered',
        updatedAt: {
          gte: startDate,
        },
      },
    });

    // Calculate revenue by day
    const revenueByDay = orders.reduce((acc, order) => {
      if (['paid', 'shipped', 'completed'].includes(order.status)) {
        const date = order.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + order.totalAmount;
      }
      return acc;
    }, {});

    // Calculate conversion metrics
    const totalBidsInPeriod = await prisma.bid.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    const acceptedBidsInPeriod = await prisma.bid.count({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: 'accepted',
      },
    });

    const analytics = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      metrics: {
        totalOrders: orders.length,
        totalRevenue: orders
          .filter((o) => ['paid', 'shipped', 'completed'].includes(o.status))
          .reduce((sum, o) => sum + o.totalAmount, 0),
        newUsers,
        completedDeliveries,
        averageOrderValue:
          orders.length > 0
            ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length
            : 0,
        bidConversionRate:
          totalBidsInPeriod > 0
            ? ((acceptedBidsInPeriod / totalBidsInPeriod) * 100).toFixed(2)
            : 0,
      },
      revenueByDay: Object.entries(revenueByDay)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };

    logger.info('Admin retrieved analytics', {
      requestId: req.id,
      adminId: req.user.id,
      period,
    });

    res.json({ analytics });
  } catch (error) {
    logger.error('Get analytics error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve analytics',
      code: 'GET_ANALYTICS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update user role
 * PUT /api/admin/users/:id/role
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['buyer', 'seller', 'courier', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: true,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE',
        requestId: req.id,
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Prevent admin from changing their own role
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: true,
        message: 'Cannot change your own role',
        code: 'SELF_ROLE_CHANGE',
        requestId: req.id,
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Admin updated user role', {
      requestId: req.id,
      adminId: req.user.id,
      targetUserId: id,
      oldRole: user.role,
      newRole: role,
    });

    res.json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Update user role error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update user role',
      code: 'UPDATE_ROLE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: true,
        products: true,
        deliveries: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete your own account',
        code: 'SELF_DELETE',
        requestId: req.id,
      });
    }

    // Check for active orders or deliveries
    const activeOrders = user.orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
    const activeDeliveries = user.deliveries.filter((d) => !['delivered', 'failed'].includes(d.status));

    if (activeOrders.length > 0 || activeDeliveries.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete user with active orders or deliveries',
        code: 'ACTIVE_TRANSACTIONS',
        requestId: req.id,
        details: {
          activeOrders: activeOrders.length,
          activeDeliveries: activeDeliveries.length,
        },
      });
    }

    // Delete user (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    logger.info('Admin deleted user', {
      requestId: req.id,
      adminId: req.user.id,
      deletedUserId: id,
      deletedUserRole: user.role,
    });

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to delete user',
      code: 'DELETE_USER_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get all orders (admin view)
 * GET /api/admin/orders
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { status, buyerId, sellerId, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (status) {
      const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'disputed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
          requestId: req.id,
        });
      }
      where.status = status;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (sellerId) {
      where.product = {
        sellerId,
      };
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          escrow: true,
          delivery: {
            include: {
              courier: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    logger.info('Admin retrieved all orders', {
      requestId: req.id,
      adminId: req.user.id,
      count: orders.length,
      total,
    });

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get all orders error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve orders',
      code: 'GET_ORDERS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get all disputed orders
 * GET /api/admin/disputes
 */
exports.getDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    if (status) {
      const validStatuses = ['pending', 'under_review', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
          requestId: req.id,
        });
      }
      where.status = status;
    }

    // Get disputes with pagination
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                    },
                  },
                },
              },
              escrow: true,
              delivery: {
                include: {
                  courier: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.dispute.count({ where }),
    ]);

    // Get dispute statistics
    const stats = await prisma.dispute.groupBy({
      by: ['status'],
      _count: true,
    });

    logger.info('Admin retrieved disputes', {
      requestId: req.id,
      adminId: req.user.id,
      count: disputes.length,
      total,
      status: status || 'all',
    });

    res.json({
      disputes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      stats: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
      appliedFilters: {
        status: status || null,
      },
    });
  } catch (error) {
    logger.error('Get disputes error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve disputes',
      code: 'GET_DISPUTES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Resolve a dispute
 * PUT /api/admin/disputes/:id/resolve
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, refundBuyer } = req.body;

    if (!resolution) {
      return res.status(400).json({
        error: true,
        message: 'Resolution is required',
        code: 'MISSING_RESOLUTION',
        requestId: req.id,
      });
    }

    // Find dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
            escrow: true,
          },
        },
        user: true,
      },
    });

    if (!dispute) {
      return res.status(404).json({
        error: true,
        message: 'Dispute not found',
        code: 'DISPUTE_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (dispute.status !== 'pending' && dispute.status !== 'under_review') {
      return res.status(400).json({
        error: true,
        message: 'Dispute is already resolved',
        code: 'DISPUTE_ALREADY_RESOLVED',
        requestId: req.id,
      });
    }

    // Determine new order status based on resolution
    let newOrderStatus = 'completed';
    if (refundBuyer) {
      newOrderStatus = 'cancelled';

      // Process refund if requested
      if (dispute.order.escrow && dispute.order.escrow.paymentIntentId && process.env.STRIPE_SECRET_KEY) {
        try {
          const { createRefund } = require('../lib/stripe');
          await createRefund(dispute.order.escrow.paymentIntentId, null, 'requested_by_customer');

          logger.info('Refund processed for dispute resolution', {
            requestId: req.id,
            disputeId: id,
            orderId: dispute.orderId,
            adminId: req.user.id,
          });
        } catch (refundError) {
          logger.error('Refund failed during dispute resolution:', {
            requestId: req.id,
            error: refundError.message,
            disputeId: id,
            orderId: dispute.orderId,
          });
        }
      }
    }

    // Update dispute status to resolved
    const resolvedDispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: 'resolved',
        resolution,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
      },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            escrow: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        resolver: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: dispute.orderId },
      data: { status: newOrderStatus },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        product: {
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        escrow: true,
      },
    });

    logger.info('Dispute resolved', {
      requestId: req.id,
      disputeId: id,
      orderId: dispute.orderId,
      adminId: req.user.id,
      resolution,
      refundBuyer,
      newOrderStatus,
    });

    // Broadcast update
    broadcastOrderUpdate(updatedOrder);

    // Send email notifications (async, don't block response)
    const emailContent = templates.disputeResolved(updatedOrder, updatedOrder.product, resolution);

    // Email to buyer
    sendEmail({
      to: updatedOrder.buyer.email,
      ...emailContent,
    }).catch((error) => {
      logger.error('Failed to send dispute resolution email to buyer:', {
        requestId: req.id,
        disputeId: id,
        orderId: dispute.orderId,
        error: error.message,
      });
    });

    // Email to seller
    sendEmail({
      to: updatedOrder.product.seller.email,
      ...emailContent,
    }).catch((error) => {
      logger.error('Failed to send dispute resolution email to seller:', {
        requestId: req.id,
        disputeId: id,
        orderId: dispute.orderId,
        error: error.message,
      });
    });

    res.json({
      message: 'Dispute resolved successfully',
      dispute: resolvedDispute,
      order: updatedOrder,
      resolution: {
        resolvedBy: req.user.id,
        resolution,
        refundIssued: refundBuyer,
        resolvedAt: resolvedDispute.resolvedAt,
      },
    });
  } catch (error) {
    logger.error('Resolve dispute error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to resolve dispute',
      code: 'RESOLVE_DISPUTE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Search orders with advanced filtering (admin only)
 * GET /api/admin/orders/search
 */
exports.searchOrders = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      status = '',
      buyerId = '',
      sellerId = '',
      minAmount = '',
      maxAmount = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    // Text search across order details
    if (q) {
      where.OR = [
        // Search by order ID (if q looks like an ID)
        ...(q.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? [{ id: q }] : []),
        // Search in buyer username/email
        {
          buyer: {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        // Search in seller username/email
        {
          product: {
            seller: {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
        // Search in product title
        {
          product: {
            title: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    // Apply filters
    if (status) {
      const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'disputed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
          requestId: req.id,
        });
      }
      where.status = status;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (sellerId) {
      where.product = {
        sellerId,
      };
    }

    // Amount range filtering
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) where.totalAmount.gte = parseFloat(minAmount);
      if (maxAmount) where.totalAmount.lte = parseFloat(maxAmount);
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt', 'totalAmount', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          escrow: true,
          delivery: {
            include: {
              courier: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { [orderByField]: orderDirection },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    // Get search analytics
    const searchAnalytics = q ? await getOrderSearchAnalytics(q) : null;

    logger.info('Admin searched orders', {
      requestId: req.id,
      adminId: req.user.id,
      query: q,
      count: orders.length,
      total,
      filters: { status, buyerId, sellerId, minAmount, maxAmount, dateFrom, dateTo },
    });

    res.json({
      query: q || null,
      items: orders,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + orders.length < total,
      },
      analytics: searchAnalytics,
      appliedFilters: {
        status: status || null,
        buyerId: buyerId || null,
        sellerId: sellerId || null,
        amountRange: minAmount || maxAmount ? { min: minAmount, max: maxAmount } : null,
        dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
      },
    });
  } catch (error) {
    logger.error('Search orders error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to search orders',
      code: 'SEARCH_ORDERS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get search analytics for orders
 * @param {string} query - Search query
 * @returns {Object} Analytics data
 */
const getOrderSearchAnalytics = async (query) => {
  try {
    // Count orders matching different search criteria
    const [totalOrders, buyerMatches, sellerMatches, productMatches] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          OR: [
            { buyer: { username: { contains: query, mode: 'insensitive' } } },
            { buyer: { email: { contains: query, mode: 'insensitive' } } },
          ],
        },
      }),
      prisma.order.count({
        where: {
          product: {
            seller: {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          product: {
            title: { contains: query, mode: 'insensitive' },
          },
        },
      }),
    ]);

    return {
      totalOrders,
      matchesByType: {
        buyers: buyerMatches,
        sellers: sellerMatches,
        products: productMatches,
      },
      searchCoverage: totalOrders > 0 ? ((buyerMatches + sellerMatches + productMatches) / totalOrders * 100).toFixed(1) : 0,
    };
  } catch (error) {
    logger.error('Get order search analytics error:', { error: error.message });
    return null;
  }
};

/**
 * Get user analytics for admin dashboard
 * @param {Object} whereClause - Prisma where clause for filtering
 * @returns {Object} Analytics data
 */
const getUserAnalytics = async (whereClause) => {
  try {
    const [
      totalUsers,
      usersByRole,
      activeUsers,
      newUsersThisMonth,
      topSellers,
      topBuyers,
    ] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.groupBy({
        by: ['role'],
        where: whereClause,
        _count: true,
      }),
      prisma.user.count({
        where: {
          ...whereClause,
          OR: [
            { orders: { some: {} } },
            { bids: { some: {} } },
            { products: { some: {} } },
            { deliveries: { some: {} } },
          ],
        },
      }),
      prisma.user.count({
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Top sellers by order count
      prisma.user.findMany({
        where: {
          ...whereClause,
          role: 'seller',
        },
        select: {
          id: true,
          username: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 5,
      }),
      // Top buyers by order count
      prisma.user.findMany({
        where: {
          ...whereClause,
          role: 'buyer',
        },
        select: {
          id: true,
          username: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersThisMonth,
        activityRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
      },
      byRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {}),
      topSellers: topSellers.map(seller => ({
        id: seller.id,
        username: seller.username,
        orderCount: seller._count.orders,
      })),
      topBuyers: topBuyers.map(buyer => ({
        id: buyer.id,
        username: buyer.username,
        orderCount: buyer._count.orders,
      })),
    };
  } catch (error) {
    logger.error('Get user analytics error:', { error: error.message });
    return null;
  }
};

module.exports = exports;
