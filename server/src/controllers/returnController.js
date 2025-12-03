const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { generateReference } = require('../lib/utils');

/**
 * Return/Exchange Controller
 * Handles product returns and exchanges
 */

/**
 * Get return requests
 * GET /api/returns
 */
exports.getReturnRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [returnRequests, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          product: {
            select: {
              title: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({
      success: true,
      returnRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get return requests error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve return requests',
    });
  }
};

/**
 * Get return request by ID
 * GET /api/returns/:id
 */
exports.getReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
        product: {
          select: {
            title: true,
            images: true,
            price: true,
          },
        },
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        error: true,
        message: 'Return request not found',
      });
    }

    res.json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    logger.error('Get return request error:', { error: error.message, returnId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve return request',
    });
  }
};

/**
 * Create return request
 * POST /api/returns
 */
exports.createReturnRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, productId, reason, description, images } = req.body;

    // Check if order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        orderItems: {
          where: { productId },
        },
      },
    });

    if (!order || order.orderItems.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Order or product not found',
      });
    }

    // Check if order is eligible for return (e.g., within 14 days)
    const daysSinceOrder = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceOrder > 14) {
      return res.status(400).json({
        error: true,
        message: 'Return period has expired (14 days)',
      });
    }

    // Check if return already exists for this product
    const existingReturn = await prisma.returnRequest.findFirst({
      where: {
        userId,
        orderId,
        productId,
        status: { in: ['PENDING', 'APPROVED', 'SHIPPING', 'RECEIVED'] },
      },
    });

    if (existingReturn) {
      return res.status(400).json({
        error: true,
        message: 'Return request already exists for this product',
      });
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        userId,
        orderId,
        productId,
        reason,
        description,
        images,
        returnNumber: generateReference('RTN'),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        product: {
          select: {
            title: true,
            images: true,
          },
        },
      },
    });

    logger.info('Return request created', {
      returnId: returnRequest.id,
      returnNumber: returnRequest.returnNumber,
      orderId,
      userId,
    });

    res.json({
      success: true,
      message: 'Return request created successfully',
      returnRequest,
    });
  } catch (error) {
    logger.error('Create return request error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create return request',
    });
  }
};

/**
 * Cancel return request
 * PUT /api/returns/:id/cancel
 */
exports.cancelReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        userId,
        status: 'PENDING',
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        error: true,
        message: 'Return request not found or cannot be cancelled',
      });
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    logger.info('Return request cancelled', { returnId: id, userId });

    res.json({
      success: true,
      message: 'Return request cancelled successfully',
      returnRequest: updatedReturn,
    });
  } catch (error) {
    logger.error('Cancel return request error:', { error: error.message, returnId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to cancel return request',
    });
  }
};

/**
 * Approve return request (Seller/Admin only)
 * PUT /api/returns/:id/approve
 */
exports.approveReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, shippingLabel } = req.body;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        error: true,
        message: 'Return request not found',
      });
    }

    // Check if user is seller or admin
    if (returnRequest.order.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    if (returnRequest.status !== 'PENDING') {
      return res.status(400).json({
        error: true,
        message: 'Return request cannot be approved',
      });
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        refundAmount,
        shippingLabel,
      },
    });

    logger.info('Return request approved', {
      returnId: id,
      approvedBy: req.user.id,
      refundAmount,
    });

    res.json({
      success: true,
      message: 'Return request approved',
      returnRequest: updatedReturn,
    });
  } catch (error) {
    logger.error('Approve return request error:', { error: error.message, returnId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to approve return request',
    });
  }
};

/**
 * Reject return request (Seller/Admin only)
 * PUT /api/returns/:id/reject
 */
exports.rejectReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        error: true,
        message: 'Return request not found',
      });
    }

    // Check if user is seller or admin
    if (returnRequest.order.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    if (returnRequest.status !== 'PENDING') {
      return res.status(400).json({
        error: true,
        message: 'Return request cannot be rejected',
      });
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
      },
    });

    logger.info('Return request rejected', {
      returnId: id,
      rejectedBy: req.user.id,
      reason: rejectionReason,
    });

    res.json({
      success: true,
      message: 'Return request rejected',
      returnRequest: updatedReturn,
    });
  } catch (error) {
    logger.error('Reject return request error:', { error: error.message, returnId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to reject return request',
    });
  }
};

/**
 * Complete return (Seller/Admin only)
 * PUT /api/returns/:id/complete
 */
exports.completeReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!returnRequest) {
      return res.status(404).json({
        error: true,
        message: 'Return request not found',
      });
    }

    // Check if user is seller or admin
    if (returnRequest.order.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized',
      });
    }

    if (returnRequest.status !== 'RECEIVED') {
      return res.status(400).json({
        error: true,
        message: 'Return must be received before completion',
      });
    }

    // Process refund through wallet
    if (returnRequest.refundAmount > 0) {
      await prisma.transaction.create({
        data: {
          userId: returnRequest.userId,
          type: 'REFUND',
          amount: returnRequest.refundAmount,
          reference: generateReference('RFD'),
          description: `Refund for return ${returnRequest.returnNumber}`,
        },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { userId: returnRequest.userId },
        data: {
          balance: {
            increment: returnRequest.refundAmount,
          },
        },
      });
    }

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        refundProcessedAt: new Date(),
      },
    });

    logger.info('Return completed and refund processed', {
      returnId: id,
      refundAmount: returnRequest.refundAmount,
      processedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Return completed and refund processed',
      returnRequest: updatedReturn,
    });
  } catch (error) {
    logger.error('Complete return error:', { error: error.message, returnId: req.params.id });
    res.status(500).json({
      error: true,
      message: 'Failed to complete return',
    });
  }
};

module.exports = exports;
