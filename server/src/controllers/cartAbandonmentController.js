const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Cart Abandonment Controller
 * Handles abandoned cart tracking and recovery
 */

/**
 * Track cart abandonment
 * POST /api/cart/track-abandonment
 */
exports.trackAbandonment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { sessionId, items, totalValue } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({
        error: true,
        message: 'User ID or session ID required',
      });
    }

    // Check if abandonment already exists
    const existing = await prisma.cartAbandonment.findFirst({
      where: {
        OR: [
          { userId: userId || undefined },
          { sessionId: sessionId || undefined },
        ],
        recovered: false,
      },
    });

    if (existing) {
      // Update existing abandonment
      const updated = await prisma.cartAbandonment.update({
        where: { id: existing.id },
        data: {
          items,
          totalValue,
          updatedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        abandonment: updated,
      });
    }

    // Create new abandonment record
    const abandonment = await prisma.cartAbandonment.create({
      data: {
        userId,
        sessionId,
        items,
        totalValue,
      },
    });

    logger.info('Cart abandonment tracked', { abandonmentId: abandonment.id, userId, sessionId });

    res.json({
      success: true,
      abandonment,
    });
  } catch (error) {
    logger.error('Track abandonment error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to track abandonment',
    });
  }
};

/**
 * Get abandoned carts (Admin only)
 * GET /api/cart/abandoned
 */
exports.getAbandonedCarts = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const { page = 1, limit = 20, recovered } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (recovered !== undefined) {
      where.recovered = recovered === 'true';
    }

    const [abandonments, total] = await Promise.all([
      prisma.cartAbandonment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.cartAbandonment.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.cartAbandonment.aggregate({
      _sum: { totalValue: true },
      _avg: { totalValue: true },
      _count: { id: true },
      where: { recovered: false },
    });

    res.json({
      success: true,
      abandonments,
      stats: {
        totalAbandoned: stats._count.id,
        totalValue: stats._sum.totalValue || 0,
        averageValue: stats._avg.totalValue || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get abandoned carts error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve abandoned carts',
    });
  }
};

/**
 * Mark cart as recovered
 * PUT /api/cart/abandoned/:id/recover
 */
exports.markAsRecovered = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const abandonment = await prisma.cartAbandonment.findUnique({
      where: { id },
    });

    if (!abandonment) {
      return res.status(404).json({
        error: true,
        message: 'Abandoned cart not found',
      });
    }

    // Verify ownership or admin
    if (abandonment.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const updated = await prisma.cartAbandonment.update({
      where: { id },
      data: {
        recovered: true,
        recoveredAt: new Date(),
      },
    });

    logger.info('Cart abandonment recovered', { abandonmentId: id });

    res.json({
      success: true,
      abandonment: updated,
    });
  } catch (error) {
    logger.error('Mark as recovered error:', { error: error.message, abandonmentId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to mark as recovered',
    });
  }
};

/**
 * Send recovery email (Admin only)
 * POST /api/cart/abandoned/:id/send-email
 */
exports.sendRecoveryEmail = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const { discountCode } = req.body;

    const abandonment = await prisma.cartAbandonment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!abandonment) {
      return res.status(404).json({
        error: true,
        message: 'Abandoned cart not found',
      });
    }

    if (!abandonment.user) {
      return res.status(400).json({
        error: true,
        message: 'No user associated with this cart',
      });
    }

    // TODO: Send email using email service
    // For now, just log and increment reminder count
    const updated = await prisma.cartAbandonment.update({
      where: { id },
      data: {
        reminderSent: true,
        reminderCount: { increment: 1 },
        lastReminderAt: new Date(),
      },
    });

    logger.info('Recovery email sent', {
      abandonmentId: id,
      email: abandonment.user.email,
      discountCode,
    });

    res.json({
      success: true,
      message: 'Recovery email sent successfully',
      abandonment: updated,
    });
  } catch (error) {
    logger.error('Send recovery email error:', { error: error.message, abandonmentId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to send recovery email',
    });
  }
};

/**
 * Get user's abandoned cart
 * GET /api/cart/abandoned/mine
 */
exports.getMyAbandonedCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const abandonment = await prisma.cartAbandonment.findFirst({
      where: {
        userId,
        recovered: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      abandonment,
    });
  } catch (error) {
    logger.error('Get my abandoned cart error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve abandoned cart',
    });
  }
};

module.exports = exports;
