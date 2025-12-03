const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { createRefund } = require('../lib/stripe');
const { sendEmail, templates } = require('../lib/email');
const { broadcastOrderUpdate } = require('../lib/socket');
const {
  sendRefundRequestedNotification,
  sendRefundApprovedNotification,
  sendRefundRejectedNotification,
} = require('./notificationsController');

/**
 * Request a refund
 * POST /api/refunds
 */
exports.requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!orderId || !reason) {
      return res.status(400).json({
        error: true,
        message: 'Order ID and reason are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        product: {
          include: { seller: true },
        },
        escrow: true,
        refund: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check if user is the buyer
    if (order.buyerId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'You can only request refunds for your own orders',
        code: 'NOT_ORDER_OWNER',
        requestId: req.id,
      });
    }

    // Check if order is eligible for refund
    const eligibleStatuses = ['paid', 'shipped'];
    if (!eligibleStatuses.includes(order.status)) {
      return res.status(400).json({
        error: true,
        message: 'Order is not eligible for refund',
        code: 'ORDER_NOT_ELIGIBLE',
        requestId: req.id,
        details: {
          currentStatus: order.status,
          eligibleStatuses,
        },
      });
    }

    // Check if refund already exists
    if (order.refund) {
      return res.status(400).json({
        error: true,
        message: 'Refund already requested for this order',
        code: 'REFUND_EXISTS',
        requestId: req.id,
      });
    }

    // Check if escrow exists and has payment intent
    if (!order.escrow || !order.escrow.paymentIntentId) {
      return res.status(400).json({
        error: true,
        message: 'Order payment information not found',
        code: 'PAYMENT_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        userId,
        amount: order.totalAmount,
        reason,
        status: 'pending',
      },
      include: {
        order: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
        user: true,
      },
    });

    logger.info('Refund requested', {
      requestId: req.id,
      refundId: refund.id,
      orderId,
      userId,
      amount: refund.amount,
    });

    // Send email notification to seller
    sendRefundRequestedNotification(refund, refund.order);

    res.status(201).json({
      message: 'Refund request submitted successfully',
      refund: {
        id: refund.id,
        orderId: refund.orderId,
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt,
      },
    });
  } catch (error) {
    logger.error('Request refund error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to request refund',
      code: 'REFUND_REQUEST_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get user's refund requests
 * GET /api/refunds
 */
exports.getUserRefunds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { userId };
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected', 'processed'];
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

    // Get refunds with pagination
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.refund.count({ where }),
    ]);

    logger.info('User retrieved refunds', {
      requestId: req.id,
      userId,
      count: refunds.length,
      total,
    });

    res.json({
      refunds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get user refunds error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve refunds',
      code: 'GET_REFUNDS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get refund details
 * GET /api/refunds/:id
 */
exports.getRefundById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const refund = await prisma.refund.findUnique({
      where: { id },
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
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        processor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!refund) {
      return res.status(404).json({
        error: true,
        message: 'Refund not found',
        code: 'REFUND_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check if user has permission to view this refund
    const isOwner = refund.userId === userId;
    const isSeller = refund.order.product.seller.id === userId;

    if (!isOwner && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this refund',
        code: 'REFUND_ACCESS_DENIED',
        requestId: req.id,
      });
    }

    logger.info('Refund details retrieved', {
      requestId: req.id,
      refundId: id,
      userId,
    });

    res.json({ refund });
  } catch (error) {
    logger.error('Get refund by ID error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve refund details',
      code: 'GET_REFUND_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Cancel refund request (buyer only)
 * PUT /api/refunds/:id/cancel
 */
exports.cancelRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!refund) {
      return res.status(404).json({
        error: true,
        message: 'Refund not found',
        code: 'REFUND_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check if user is the refund requester
    if (refund.userId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'You can only cancel your own refund requests',
        code: 'NOT_REFUND_OWNER',
        requestId: req.id,
      });
    }

    // Check if refund can be cancelled
    if (refund.status !== 'pending') {
      return res.status(400).json({
        error: true,
        message: 'Refund request cannot be cancelled',
        code: 'REFUND_NOT_CANCELLABLE',
        requestId: req.id,
        details: {
          currentStatus: refund.status,
        },
      });
    }

    // Delete the refund request
    await prisma.refund.delete({
      where: { id },
    });

    logger.info('Refund request cancelled', {
      requestId: req.id,
      refundId: id,
      userId,
    });

    res.json({
      message: 'Refund request cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel refund error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to cancel refund request',
      code: 'CANCEL_REFUND_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Process refund (admin only)
 * PUT /api/refunds/:id/process
 */
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user.id;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: true,
        message: 'Action must be either "approve" or "reject"',
        code: 'INVALID_ACTION',
        requestId: req.id,
      });
    }

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            escrow: true,
            product: {
              include: { seller: true },
            },
          },
        },
        user: true,
      },
    });

    if (!refund) {
      return res.status(404).json({
        error: true,
        message: 'Refund not found',
        code: 'REFUND_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({
        error: true,
        message: 'Refund has already been processed',
        code: 'REFUND_ALREADY_PROCESSED',
        requestId: req.id,
        details: {
          currentStatus: refund.status,
        },
      });
    }

    let newStatus = 'rejected';
    let refundId = null;

    if (action === 'approve') {
      // Process the refund with Stripe
      try {
        if (!refund.order.escrow || !refund.order.escrow.paymentIntentId) {
          throw new Error('Payment intent not found');
        }

        const stripeRefund = await createRefund(
          refund.order.escrow.paymentIntentId,
          refund.amount,
          'requested_by_customer'
        );

        refundId = stripeRefund.id;
        newStatus = 'processed';

        logger.info('Stripe refund processed', {
          requestId: req.id,
          refundId: id,
          stripeRefundId: refundId,
          amount: refund.amount,
        });
      } catch (stripeError) {
        logger.error('Stripe refund failed:', {
          requestId: req.id,
          refundId: id,
          error: stripeError.message,
        });

        // Still mark as approved but note the failure
        newStatus = 'approved';
      }
    } else {
      newStatus = 'rejected';
    }

    // Update refund
    const updatedRefund = await prisma.refund.update({
      where: { id },
      data: {
        status: newStatus,
        refundId,
        processedBy: adminId,
        processedAt: new Date(),
      },
      include: {
        order: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
        user: true,
        processor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Update order status if refund was processed
    if (newStatus === 'processed') {
      await prisma.order.update({
        where: { id: refund.orderId },
        data: { status: 'cancelled' },
      });

      // Broadcast order update
      const updatedOrder = await prisma.order.findUnique({
        where: { id: refund.orderId },
        include: {
          buyer: true,
          product: {
            include: { seller: true },
          },
        },
      });
      broadcastOrderUpdate(updatedOrder);
    }

    logger.info('Refund processed', {
      requestId: req.id,
      refundId: id,
      adminId,
      action,
      newStatus,
    });

    // Send email notifications
    if (action === 'approve') {
      sendRefundApprovedNotification(updatedRefund, updatedRefund.order);
    } else {
      sendRefundRejectedNotification(updatedRefund, updatedRefund.order, notes);
    }

    res.json({
      message: `Refund ${action}d successfully`,
      refund: updatedRefund,
    });
  } catch (error) {
    logger.error('Process refund error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to process refund',
      code: 'PROCESS_REFUND_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get all refunds (admin only)
 * GET /api/admin/refunds
 */
exports.getAllRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected', 'processed'];
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
    if (userId) {
      where.userId = userId;
    }

    // Get refunds with pagination
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
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
                select: {
                  id: true,
                  title: true,
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
          processor: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.refund.count({ where }),
    ]);

    logger.info('Admin retrieved all refunds', {
      requestId: req.id,
      adminId: req.user.id,
      count: refunds.length,
      total,
    });

    res.json({
      refunds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get all refunds error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve refunds',
      code: 'GET_ALL_REFUNDS_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;