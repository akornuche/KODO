const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const bcrypt = require('bcryptjs');

/**
 * Get current user profile (extended)
 * GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
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
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    logger.info('User profile retrieved', {
      requestId: req.id,
      userId,
    });

    res.json({ user });
  } catch (error) {
    logger.error('Get profile error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve profile',
      code: 'GET_PROFILE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, username } = req.body;

    // Validation
    if (!email && !username) {
      return res.status(400).json({
        error: true,
        message: 'At least one field (email or username) is required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    // Check if email/username already taken
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (existingEmail) {
        return res.status(409).json({
          error: true,
          message: 'Email already in use',
          code: 'EMAIL_EXISTS',
          requestId: req.id,
        });
      }
    }

    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });

      if (existingUsername) {
        return res.status(409).json({
          error: true,
          message: 'Username already in use',
          code: 'USERNAME_EXISTS',
          requestId: req.id,
        });
      }
    }

    // Update user
    const updateData = {};
    if (email) updateData.email = email;
    if (username) updateData.username = username;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User profile updated', {
      requestId: req.id,
      userId,
      updatedFields: Object.keys(updateData),
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    logger.error('Update profile error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update bank account information (for sellers)
 * PUT /api/users/bank-account
 */
exports.updateBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { bankName, accountNumber, accountName, bankCode } = req.body;

    // Only sellers can update bank account information
    if (userRole !== 'seller') {
      return res.status(403).json({
        error: true,
        message: 'Only sellers can update bank account information',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Validation
    if (!bankName || !accountNumber || !accountName || !bankCode) {
      return res.status(400).json({
        error: true,
        message: 'All bank account fields are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    // Validate account number (should be 10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        error: true,
        message: 'Account number must be 10 digits',
        code: 'INVALID_ACCOUNT_NUMBER',
        requestId: req.id,
      });
    }

    // Update bank account information
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bankName,
        accountNumber,
        accountName,
        bankCode,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        bankCode: true,
        updatedAt: true,
      },
    });

    logger.info('Bank account information updated', {
      requestId: req.id,
      userId,
      bankName,
      accountNumber: accountNumber.substring(0, 4) + '****', // Log only first 4 digits
    });

    res.json({
      message: 'Bank account information updated successfully',
      bankAccount: {
        bankName: updatedUser.bankName,
        accountNumber: updatedUser.accountNumber,
        accountName: updatedUser.accountName,
        bankCode: updatedUser.bankCode,
      },
    });
  } catch (error) {
    logger.error('Update bank account error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update bank account information',
      code: 'UPDATE_BANK_ACCOUNT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get bank account information (for sellers)
 * GET /api/users/bank-account
 */
exports.getBankAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only sellers can view bank account information
    if (userRole !== 'seller') {
      return res.status(403).json({
        error: true,
        message: 'Only sellers can view bank account information',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        bankCode: true,
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

    logger.info('Bank account information retrieved', {
      requestId: req.id,
      userId,
      hasBankAccount: !!(user.bankName && user.accountNumber),
    });

    res.json({
      bankAccount: {
        bankName: user.bankName,
        accountNumber: user.accountNumber,
        accountName: user.accountName,
        bankCode: user.bankCode,
        isComplete: !!(user.bankName && user.accountNumber && user.accountName && user.bankCode),
      },
    });
  } catch (error) {
    logger.error('Get bank account error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve bank account information',
      code: 'GET_BANK_ACCOUNT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Change password
 * PUT /api/users/password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Current password and new password are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: true,
        message: 'New password must be at least 8 characters long',
        code: 'INVALID_PASSWORD',
        requestId: req.id,
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: true,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
        requestId: req.id,
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info('User password changed', {
      requestId: req.id,
      userId,
    });

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update courier location (for couriers)
 * PUT /api/users/location
 */
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { lat, lng } = req.body;

    // Only couriers can update location via this endpoint
    if (userRole !== 'courier') {
      return res.status(403).json({
        error: true,
        message: 'Only couriers can update their location',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Validation
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        error: true,
        message: 'Invalid coordinates. Lat and lng must be numbers',
        code: 'INVALID_COORDINATES',
        requestId: req.id,
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: true,
        message: 'Coordinates out of range',
        code: 'INVALID_COORDINATES',
        requestId: req.id,
      });
    }

    // Update location
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastKnownLat: lat,
        lastKnownLng: lng,
      },
    });

    logger.info('Courier location updated', {
      requestId: req.id,
      userId,
      lat,
      lng,
    });

    res.json({
      message: 'Location updated successfully',
      location: { lat, lng },
    });
  } catch (error) {
    logger.error('Update location error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update location',
      code: 'UPDATE_LOCATION_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete user account (self-deletion)
 * DELETE /api/users/account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Require password confirmation
    if (!password) {
      return res.status(400).json({
        error: true,
        message: 'Password is required to delete account',
        code: 'MISSING_PASSWORD',
        requestId: req.id,
      });
    }

    // Get user with related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: true,
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: true,
        message: 'Password is incorrect',
        code: 'INVALID_PASSWORD',
        requestId: req.id,
      });
    }

    // Check for active orders or deliveries
    const activeOrders = user.orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
    const activeDeliveries = user.deliveries.filter((d) => !['delivered', 'failed'].includes(d.status));

    if (activeOrders.length > 0 || activeDeliveries.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Cannot delete account with active orders or deliveries',
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
      where: { id: userId },
    });

    logger.info('User account deleted', {
      requestId: req.id,
      userId,
      role: user.role,
    });

    res.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete account error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to delete account',
      code: 'DELETE_ACCOUNT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get user statistics
 * GET /api/users/stats
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'seller') {
      // Seller stats
      const [productCount, orderCount, totalRevenue] = await Promise.all([
        prisma.product.count({
          where: { sellerId: userId },
        }),
        prisma.order.count({
          where: {
            product: {
              sellerId: userId,
            },
            status: {
              in: ['completed'],
            },
          },
        }),
        prisma.order.aggregate({
          where: {
            product: {
              sellerId: userId,
            },
            status: {
              in: ['completed'],
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      stats = {
        role: 'seller',
        products: productCount,
        completedOrders: orderCount,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      };
    } else if (userRole === 'buyer') {
      // Buyer stats
      const [bidCount, orderCount, totalSpent] = await Promise.all([
        prisma.bid.count({
          where: { buyerId: userId },
        }),
        prisma.order.count({
          where: { buyerId: userId },
        }),
        prisma.order.aggregate({
          where: {
            buyerId: userId,
            status: {
              in: ['paid', 'shipped', 'completed'],
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      stats = {
        role: 'buyer',
        requests: bidCount,
        orders: orderCount,
        totalSpent: totalSpent._sum.totalAmount || 0,
      };
    } else if (userRole === 'courier') {
      // Courier stats
      const [totalDeliveries, completedDeliveries, inProgressDeliveries] = await Promise.all([
        prisma.delivery.count({
          where: { courierId: userId },
        }),
        prisma.delivery.count({
          where: {
            courierId: userId,
            status: 'delivered',
          },
        }),
        prisma.delivery.count({
          where: {
            courierId: userId,
            status: {
              in: ['assigned', 'in_transit'],
            },
          },
        }),
      ]);

      stats = {
        role: 'courier',
        totalDeliveries,
        completedDeliveries,
        inProgressDeliveries,
      };
    }

    logger.info('User stats retrieved', {
      requestId: req.id,
      userId,
      role: userRole,
    });

    res.json({ stats });
  } catch (error) {
    logger.error('Get user stats error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve user statistics',
      code: 'GET_STATS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get buyer dashboard statistics and data
 * GET /api/users/dashboard/buyer
 */
exports.getBuyerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get comprehensive buyer stats
    const [
      activeBids,
      totalOrders,
      pendingOrders,
      totalSpent,
      averageOrderValue,
      topCategories,
      recentOrders,
    ] = await Promise.all([
      // Active bids (pending or with offers)
      prisma.bid.count({
        where: {
          buyerId: userId,
          status: { in: ['pending', 'offer_received'] },
        },
      }),
      // Total orders
      prisma.order.count({
        where: { buyerId: userId },
      }),
      // Pending orders
      prisma.order.count({
        where: {
          buyerId: userId,
          status: { in: ['pending', 'paid'] },
        },
      }),
      // Total spent
      prisma.order.aggregate({
        where: {
          buyerId: userId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _sum: { totalAmount: true },
      }),
      // Average order value
      prisma.order.aggregate({
        where: {
          buyerId: userId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _avg: { totalAmount: true },
      }),
      // Top categories (most purchased)
      prisma.order.groupBy({
        by: ['product'],
        where: {
          buyerId: userId,
        },
        _count: {
          id: true,
        },
        take: 3,
      }),
      // Recent orders (last 5)
      prisma.order.findMany({
        where: { buyerId: userId },
        include: {
          product: {
            select: {
              title: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const stats = {
      activeBids,
      totalOrders,
      pendingOrders,
      totalSpent: totalSpent._sum.totalAmount || 0,
      averageOrderValue: Math.round((averageOrderValue._avg.totalAmount || 0) * 100) / 100,
      orderCount: totalOrders,
      recentOrdersCount: recentOrders.length,
      activityMetrics: {
        ordersThisMonth: recentOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          const now = new Date();
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }).length,
      },
    };

    logger.info('Buyer dashboard stats retrieved', {
      requestId: req.id,
      userId,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Get buyer dashboard stats error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve buyer dashboard statistics',
      code: 'GET_BUYER_DASHBOARD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get seller dashboard statistics and data
 * GET /api/users/dashboard/seller
 */
exports.getSellerStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get comprehensive seller stats
    const [
      totalProducts,
      activeBids,
      totalSales,
      pendingSales,
      totalRevenue,
      averageSalePrice,
      topProducts,
      recentSales,
    ] = await Promise.all([
      // Total products
      prisma.product.count({
        where: { sellerId: userId },
      }),
      // Active bids on products
      prisma.bid.count({
        where: {
          product: { sellerId: userId },
          status: { in: ['pending', 'offer_received'] },
        },
      }),
      // Total sales
      prisma.order.count({
        where: {
          product: { sellerId: userId },
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
      }),
      // Pending sales
      prisma.order.count({
        where: {
          product: { sellerId: userId },
          status: { in: ['pending', 'paid'] },
        },
      }),
      // Total revenue
      prisma.order.aggregate({
        where: {
          product: { sellerId: userId },
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _sum: { totalAmount: true },
      }),
      // Average sale price
      prisma.order.aggregate({
        where: {
          product: { sellerId: userId },
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _avg: { totalAmount: true },
      }),
      // Top products (most sold)
      prisma.order.groupBy({
        by: ['productId'],
        where: {
          product: { sellerId: userId },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 3,
      }),
      // Recent sales (last 5)
      prisma.order.findMany({
        where: {
          product: { sellerId: userId },
        },
        include: {
          product: {
            select: {
              title: true,
              price: true,
            },
          },
          buyer: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const stats = {
      totalProducts,
      activeBids,
      totalSales,
      pendingSales,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      averageSalePrice: Math.round((averageSalePrice._avg.totalAmount || 0) * 100) / 100,
      recentSalesCount: recentSales.length,
      activityMetrics: {
        salesThisMonth: recentSales.filter(o => {
          const orderDate = new Date(o.createdAt);
          const now = new Date();
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }).length,
      },
    };

    logger.info('Seller dashboard stats retrieved', {
      requestId: req.id,
      userId,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Get seller dashboard stats error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve seller dashboard statistics',
      code: 'GET_SELLER_DASHBOARD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get courier dashboard statistics and data
 * GET /api/users/dashboard/courier
 */
exports.getCourierStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get comprehensive courier stats
    const [
      availableDeliveries,
      activeDeliveries,
      completedDeliveries,
      totalEarnings,
      averageFee,
      deliveriesThisMonth,
      acceptanceRate,
    ] = await Promise.all([
      // Available deliveries
      prisma.delivery.count({
        where: {
          status: 'pending',
          courierId: null,
        },
      }),
      // Active deliveries
      prisma.delivery.count({
        where: {
          courierId: userId,
          status: { in: ['assigned', 'picked_up', 'in_transit'] },
        },
      }),
      // Completed deliveries
      prisma.delivery.count({
        where: {
          courierId: userId,
          status: 'delivered',
        },
      }),
      // Total earnings
      prisma.delivery.aggregate({
        where: {
          courierId: userId,
          status: 'delivered',
        },
        _sum: { fee: true },
      }),
      // Average fee per delivery
      prisma.delivery.aggregate({
        where: {
          courierId: userId,
          status: 'delivered',
        },
        _avg: { fee: true },
      }),
      // Deliveries this month
      prisma.delivery.count({
        where: {
          courierId: userId,
          status: 'delivered',
          deliveredAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      // Acceptance rate (completed / assigned)
      prisma.delivery.count({
        where: {
          courierId: userId,
          status: { in: ['assigned', 'picked_up', 'in_transit', 'delivered'] },
        },
      }),
    ]);

    const totalAssigned = await prisma.delivery.count({
      where: {
        courierId: userId,
        status: { in: ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'] },
      },
    });

    const stats = {
      availableDeliveries,
      activeDeliveries,
      completedDeliveries,
      totalEarnings: totalEarnings._sum.fee || 0,
      averageFee: Math.round((averageFee._avg.fee || 0) * 100) / 100,
      deliveriesThisMonth,
      acceptanceRate: totalAssigned > 0 ? Math.round((completedDeliveries / totalAssigned) * 100) : 0,
      activityMetrics: {
        onDutyNow: activeDeliveries,
        successRate: totalAssigned > 0 ? Math.round((completedDeliveries / totalAssigned) * 100) : 0,
      },
    };

    logger.info('Courier dashboard stats retrieved', {
      requestId: req.id,
      userId,
    });

    res.json(stats);
  } catch (error) {
    logger.error('Get courier dashboard stats error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve courier dashboard statistics',
      code: 'GET_COURIER_DASHBOARD_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;
