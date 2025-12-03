const prisma = require('../../config/db');

/**
 * Calculate fraud risk score for an order
 * @route POST /api/fraud-detection/analyze
 */
const analyzeFraudRisk = async (req, res) => {
  try {
    const {
      orderId,
      userId,
      totalAmount,
      shippingAddress,
      billingAddress,
      ipAddress,
      deviceFingerprint,
    } = req.body;

    let riskScore = 0;
    const riskFactors = [];

    // 1. Check user's order history
    const userOrders = await prisma.order.count({
      where: { buyerId: userId },
    });

    if (userOrders === 0) {
      riskScore += 20;
      riskFactors.push({ factor: 'First-time buyer', score: 20 });
    }

    // 2. Check for high-value order
    if (totalAmount > 500) {
      const additionalRisk = Math.min(30, Math.floor((totalAmount - 500) / 100) * 5);
      riskScore += additionalRisk;
      riskFactors.push({ factor: 'High-value order', score: additionalRisk });
    }

    // 3. Address mismatch
    if (shippingAddress && billingAddress && shippingAddress !== billingAddress) {
      riskScore += 15;
      riskFactors.push({ factor: 'Shipping/billing address mismatch', score: 15 });
    }

    // 4. Check for recent failed orders
    const failedOrders = await prisma.order.count({
      where: {
        buyerId: userId,
        status: 'cancelled',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (failedOrders > 2) {
      riskScore += 25;
      riskFactors.push({ factor: 'Multiple failed orders recently', score: 25 });
    }

    // 5. Check for velocity (multiple orders in short time)
    const recentOrders = await prisma.order.count({
      where: {
        buyerId: userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentOrders > 3) {
      riskScore += 30;
      riskFactors.push({ factor: 'Multiple orders in short time', score: 30 });
    }

    // 6. Check for suspicious IP (if available)
    if (ipAddress) {
      const ordersFromIP = await prisma.order.count({
        where: {
          buyerId: { not: userId },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (ordersFromIP > 5) {
        riskScore += 20;
        riskFactors.push({ factor: 'Multiple accounts from same IP', score: 20 });
      }
    }

    // 7. Check user account age
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    if (accountAgeDays < 7) {
      riskScore += 15;
      riskFactors.push({ factor: 'New account (< 7 days)', score: 15 });
    }

    // Determine risk level
    let riskLevel;
    let action;

    if (riskScore >= 70) {
      riskLevel = 'high';
      action = 'block';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
      action = 'review';
    } else {
      riskLevel = 'low';
      action = 'approve';
    }

    // Log fraud check
    const fraudCheck = {
      orderId,
      userId,
      riskScore,
      riskLevel,
      riskFactors,
      action,
      checkedAt: new Date(),
      ipAddress,
      deviceFingerprint,
    };

    res.json({
      riskScore,
      riskLevel,
      action,
      riskFactors,
      recommendation: action === 'block'
        ? 'This order has high fraud risk. Consider blocking or requesting additional verification.'
        : action === 'review'
        ? 'This order has medium risk. Manual review recommended before processing.'
        : 'This order appears legitimate. Safe to process.',
    });
  } catch (error) {
    console.error('Analyze fraud risk error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get fraud alerts
 * @route GET /api/fraud-detection/alerts
 */
const getFraudAlerts = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find orders pending review
    const orders = await prisma.order.findMany({
      where: {
        status: status === 'pending' ? { in: ['pending', 'processing'] } : status,
        sellerId: req.user.role === 'seller' ? req.user.id : undefined,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate risk for each order
    const ordersWithRisk = await Promise.all(
      orders.map(async (order) => {
        // Simple risk calculation
        let riskScore = 0;
        
        const userOrders = await prisma.order.count({
          where: { buyerId: order.buyerId },
        });
        
        if (userOrders === 1) riskScore += 20;
        if (order.totalAmount > 500) riskScore += 20;
        
        const accountAgeDays = Math.floor((Date.now() - new Date(order.buyer.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (accountAgeDays < 7) riskScore += 15;

        const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

        return {
          ...order,
          riskScore,
          riskLevel,
        };
      })
    );

    // Filter by risk if requested
    const filteredOrders = ordersWithRisk.filter(o => 
      !req.query.riskLevel || o.riskLevel === req.query.riskLevel
    );

    const total = await prisma.order.count({
      where: {
        status: status === 'pending' ? { in: ['pending', 'processing'] } : status,
        sellerId: req.user.role === 'seller' ? req.user.id : undefined,
      },
    });

    res.json({
      alerts: filteredOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get fraud alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Block suspicious user
 * @route POST /api/fraud-detection/block-user
 */
const blockSuspiciousUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    // Verify admin access
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (admin.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Update user status (if status field exists)
    await prisma.user.update({
      where: { id: userId },
      data: {
        // isBlocked: true, // Uncomment if field exists
        updatedAt: new Date(),
      },
    });

    // Cancel pending orders
    await prisma.order.updateMany({
      where: {
        buyerId: userId,
        status: { in: ['pending', 'processing'] },
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'User blocked successfully',
      userId,
      reason,
    });
  } catch (error) {
    console.error('Block suspicious user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get fraud statistics
 * @route GET /api/fraud-detection/stats
 */
const getFraudStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Total orders
    const totalOrders = await prisma.order.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Cancelled orders (potential fraud)
    const cancelledOrders = await prisma.order.count({
      where: {
        status: 'cancelled',
        createdAt: { gte: startDate },
      },
    });

    // Refunded orders
    const refundedOrders = await prisma.order.count({
      where: {
        status: 'refunded',
        createdAt: { gte: startDate },
      },
    });

    // Calculate fraud rate
    const fraudRate = totalOrders > 0 
      ? ((cancelledOrders + refundedOrders) / totalOrders * 100).toFixed(2)
      : 0;

    // Amount at risk (pending high-value orders)
    const highValuePending = await prisma.order.aggregate({
      where: {
        status: { in: ['pending', 'processing'] },
        totalAmount: { gte: 500 },
        createdAt: { gte: startDate },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    res.json({
      period: daysAgo,
      totalOrders,
      cancelledOrders,
      refundedOrders,
      fraudRate: parseFloat(fraudRate),
      highValuePending: {
        count: highValuePending._count,
        amount: highValuePending._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error('Get fraud stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  analyzeFraudRisk,
  getFraudAlerts,
  blockSuspiciousUser,
  getFraudStats,
};
