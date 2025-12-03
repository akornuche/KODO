const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { broadcastOrderUpdate } = require('../lib/socket');
const { createPaymentIntent, createTransfer, simulatePayment, createRefund } = require('../lib/stripe');
const { createPaymentIntent: createFlutterwavePayment, verifyPayment, createTransfer: createFlutterwaveTransfer, simulatePayment: simulateFlutterwavePayment } = require('../lib/flutterwave');
const { sendEmail, templates } = require('../lib/email');
const {
  sendOrderConfirmation,
  sendPaymentReceivedNotification,
  sendOrderCompletedNotification,
  sendDisputeCreatedNotification,
} = require('./notificationsController');

/**
 * Create a direct order (Buy Now functionality)
 * POST /api/orders
 */
exports.createDirectOrder = async (req, res) => {
  try {
    const { productId, quantity = 1, deliveryAddress, notes } = req.body;
    const buyerId = req.user.id;

    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        error: true,
        message: 'Product ID is required',
        code: 'MISSING_PRODUCT_ID',
        requestId: req.id,
      });
    }

    if (!deliveryAddress) {
      return res.status(400).json({
        error: true,
        message: 'Delivery address is required',
        code: 'MISSING_DELIVERY_ADDRESS',
        requestId: req.id,
      });
    }

    // Find product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check if product is available
    if (product.status !== 'active') {
      return res.status(400).json({
        error: true,
        message: 'Product is not available for purchase',
        code: 'PRODUCT_UNAVAILABLE',
        requestId: req.id,
      });
    }

    // Check if buyer is not the seller
    if (product.sellerId === buyerId) {
      return res.status(400).json({
        error: true,
        message: 'You cannot buy your own product',
        code: 'SELF_PURCHASE_NOT_ALLOWED',
        requestId: req.id,
      });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;

    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId,
        productId,
        quantity,
        totalAmount,
        deliveryAddress,
        notes,
        status: 'pending',
      },
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
    });

    logger.info('Direct order created', {
      requestId: req.id,
      orderId: order.id,
      buyerId,
      productId,
      quantity,
      totalAmount,
    });

    // Broadcast order update via Socket.IO
    broadcastOrderUpdate(order);

    // Send email notifications (async, don't block response)
    sendOrderConfirmation(order);

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    logger.error('Create direct order error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to create order',
      code: 'CREATE_ORDER_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get all orders for current user (buyer or seller)
 * GET /api/orders
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on role
    const where = {};
    
    if (userRole === 'buyer') {
      where.buyerId = userId;
    } else if (userRole === 'seller') {
      where.product = {
        sellerId: userId,
      };
    } else if (userRole === 'admin') {
      // Admin can see all orders (no filter)
    } else {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized role',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Add status filter if provided
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

    logger.info('User orders retrieved', {
      requestId: req.id,
      userId,
      role: userRole,
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
    logger.error('Get user orders error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve orders',
      code: 'GET_ORDERS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get order by ID
 * GET /api/orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id },
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
                lastKnownLat: true,
                lastKnownLng: true,
              },
            },
          },
        },
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

    // Authorization: buyer, seller, admin, or assigned courier can view
    const isBuyer = order.buyerId === userId;
    const isSeller = order.product?.sellerId === userId;
    const isCourier = order.delivery?.courierId === userId;
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isSeller && !isCourier && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this order',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    logger.info('Order retrieved', { requestId: req.id, orderId: id, userId });

    res.json({ order });
  } catch (error) {
    logger.error('Get order by ID error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve order',
      code: 'GET_ORDER_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Pay for an order (supports Stripe and Flutterwave)
 * POST /api/orders/:id/pay
 */
exports.payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { paymentMethodId, paymentProvider = 'stripe', paymentMethod = 'card' } = req.body;

    // Find order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        product: {
          include: { seller: true },
        },
        escrow: true,
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

    // Authorization: only buyer can pay
    if (order.buyerId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'Only the buyer can pay for this order',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Check order status
    if (order.status !== 'pending') {
      return res.status(400).json({
        error: true,
        message: `Cannot pay for order with status: ${order.status}`,
        code: 'INVALID_ORDER_STATUS',
        requestId: req.id,
      });
    }

    // Check if already has escrow
    if (order.escrow) {
      return res.status(400).json({
        error: true,
        message: 'Order already paid',
        code: 'ALREADY_PAID',
        requestId: req.id,
      });
    }

    // Process payment based on provider
    let paymentResult;
    try {
      if (paymentProvider === 'flutterwave') {
        // Flutterwave payment
        if (process.env.FLUTTERWAVE_SECRET_KEY) {
          paymentResult = await createFlutterwavePayment({
            amount: order.totalAmount,
            currency: 'NGN',
            orderId: order.id,
            buyerId: userId,
            email: order.buyer.email,
            name: order.buyer.username,
            phone: order.buyer.phone,
            paymentMethod,
          });

          // For Flutterwave, return payment link for redirect
          if (paymentResult.payment_link) {
            return res.json({
              message: 'Payment initiated',
              paymentUrl: paymentResult.payment_link,
              tx_ref: paymentResult.tx_ref,
              provider: 'flutterwave',
            });
          }
        } else {
          // Simulate Flutterwave payment if not configured
          paymentResult = await simulateFlutterwavePayment({
            amount: order.totalAmount,
            currency: 'NGN',
            orderId: order.id,
            buyerId: userId,
            email: order.buyer.email,
          });
        }
      } else {
        // Default to Stripe
        if (process.env.STRIPE_SECRET_KEY) {
          paymentResult = await createPaymentIntent({
            amount: order.totalAmount,
            currency: 'ngn',
            orderId: order.id,
            buyerId: userId,
            paymentMethodId,
          });

          // Check payment status
          if (paymentResult.status !== 'succeeded') {
            return res.status(400).json({
              error: true,
              message: 'Payment not completed',
              code: 'PAYMENT_INCOMPLETE',
              requestId: req.id,
              paymentStatus: paymentResult.status,
            });
          }
        } else {
          // Simulate Stripe payment if not configured
          paymentResult = await simulatePayment({
            amount: order.totalAmount,
            currency: 'ngn',
            orderId: order.id,
            buyerId: userId,
          });
        }
      }

      logger.info('Payment processed successfully', {
        requestId: req.id,
        orderId: id,
        amount: order.totalAmount,
        paymentIntentId: paymentResult.id || paymentResult.tx_ref,
        provider: paymentProvider,
        simulated: paymentResult.simulated || false,
      });
    } catch (paymentError) {
      logger.error(`${paymentProvider} payment error:`, {
        requestId: req.id,
        error: paymentError.message,
        orderId: id,
      });

      return res.status(400).json({
        error: true,
        message: 'Payment processing failed',
        code: `${paymentProvider.toUpperCase()}_ERROR`,
        requestId: req.id,
        details: paymentError.message,
      });
    }

    // Create escrow record with payment reference
    const escrowData = {
      orderId: order.id,
      amount: order.totalAmount,
      released: false,
    };

    // Store payment reference based on provider
    if (paymentProvider === 'flutterwave') {
      escrowData.flutterwaveTxRef = paymentResult.tx_ref;
      escrowData.flutterwaveTxId = paymentResult.flutterwave_ref;
    } else {
      escrowData.paymentIntentId = paymentResult.id;
    }

    const escrow = await prisma.escrow.create({
      data: escrowData,
    });

    // Update order status to 'paid'
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'paid',
        escrowId: escrow.id,
      },
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

    logger.info('Order paid successfully', {
      requestId: req.id,
      orderId: id,
      escrowId: escrow.id,
      amount: order.totalAmount,
    });

    // Create delivery for this order
    const { createDeliveryForOrder } = require('./deliveryController');
    try {
      // Get pickup address from seller and delivery address from buyer
      const pickupAddress = order.product?.location || 
                           `Seller: ${order.product?.seller?.username || 'Unknown'}`;
      const deliveryAddress = order.buyer?.location || 
                             `Buyer: ${order.buyer?.username || 'Unknown'}`;
      
      await createDeliveryForOrder(order.id, pickupAddress, deliveryAddress);
      
      logger.info('Delivery created for paid order', {
        requestId: req.id,
        orderId: order.id,
      });
    } catch (deliveryError) {
      logger.error('Failed to create delivery:', {
        requestId: req.id,
        orderId: order.id,
        error: deliveryError.message,
      });
      // Don't fail the payment if delivery creation fails
    }

    // Broadcast order update via Socket.IO
    broadcastOrderUpdate(updatedOrder);

    // Send email notifications (async, don't block response)
    sendOrderConfirmation(updatedOrder);
    sendPaymentReceivedNotification(updatedOrder);

    res.json({
      message: 'Payment successful',
      order: updatedOrder,
      escrow,
    });
  } catch (error) {
    logger.error('Pay order error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Payment failed',
      code: 'PAYMENT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update order status
 * PUT /api/orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'disputed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
        requestId: req.id,
      });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        delivery: true,
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

    // Authorization logic based on status transition
    const isBuyer = order.buyerId === userId;
    const isSeller = order.product?.sellerId === userId;
    const isCourier = order.delivery?.courierId === userId;
    const isAdmin = userRole === 'admin';

    // Status transition rules
    let authorized = false;

    if (status === 'cancelled') {
      // Buyer or admin can cancel
      authorized = isBuyer || isAdmin;
    } else if (status === 'shipped') {
      // Seller, courier, or admin can mark as shipped
      authorized = isSeller || isCourier || isAdmin;
    } else if (status === 'completed') {
      // Buyer or admin can mark as completed
      authorized = isBuyer || isAdmin;
    } else if (status === 'disputed') {
      // Buyer or seller can dispute
      authorized = isBuyer || isSeller || isAdmin;
    } else {
      // Other statuses require admin
      authorized = isAdmin;
    }

    if (!authorized) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to update this order status',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
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
    });

    logger.info('Order status updated', {
      requestId: req.id,
      orderId: id,
      oldStatus: order.status,
      newStatus: status,
      userId,
    });

    // Auto-release escrow and transfer funds when order is completed
    if (status === 'completed' && updatedOrder.escrow && !updatedOrder.escrow.released) {
      // Trigger auto-release in background (don't block response)
      autoReleaseEscrow(id).catch(error => {
        logger.error('Auto-release escrow failed:', {
          orderId: id,
          error: error.message,
        });
      });
    }

    // Broadcast update via Socket.IO
    broadcastOrderUpdate(updatedOrder);

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    logger.error('Update order status error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update order status',
      code: 'UPDATE_STATUS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Release escrow funds (admin or automated after delivery confirmation)
 * POST /api/escrow/:id/release
 */
exports.releaseEscrow = async (req, res) => {
  try {
    const { id } = req.params; // escrow ID
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only admin can manually release escrow
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'Only admins can manually release escrow',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    const escrow = await prisma.escrow.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!escrow) {
      return res.status(404).json({
        error: true,
        message: 'Escrow not found',
        code: 'ESCROW_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (escrow.released) {
      return res.status(400).json({
        error: true,
        message: 'Escrow already released',
        code: 'ALREADY_RELEASED',
        requestId: req.id,
      });
    }

    // Release escrow funds
    const updatedEscrow = await prisma.escrow.update({
      where: { id },
      data: {
        released: true,
        releasedAt: new Date(),
      },
    });

    logger.info('Escrow released', {
      requestId: req.id,
      escrowId: id,
      orderId: escrow.orderId,
      amount: escrow.amount,
      releasedBy: userId,
    });

    // Transfer funds to seller via Stripe or Flutterwave
    if (escrow.order.product.seller.stripeAccountId && process.env.STRIPE_SECRET_KEY) {
      try {
        const transfer = await createTransfer({
          amount: escrow.amount,
          currency: 'ngn',
          destination: escrow.order.product.seller.stripeAccountId,
          orderId: escrow.orderId,
          sellerId: escrow.order.product.sellerId,
        });

        logger.info('Funds transferred to seller via Stripe', {
          requestId: req.id,
          transferId: transfer.id,
          amount: transfer.amount,
          sellerId: escrow.order.product.sellerId,
        });
      } catch (transferError) {
        logger.error('Stripe transfer to seller failed:', {
          requestId: req.id,
          error: transferError.message,
          escrowId: id,
        });
        // Note: Escrow already marked as released, this is a separate operation
      }
    } else if (escrow.flutterwaveTxRef && process.env.FLUTTERWAVE_SECRET_KEY) {
      // Transfer funds to seller via Flutterwave bank transfer
      try {
        // Get seller's bank account information
        const seller = await prisma.user.findUnique({
          where: { id: escrow.order.product.sellerId },
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            bankCode: true,
          },
        });

        if (!seller || !seller.accountNumber || !seller.accountName || !seller.bankCode) {
          logger.warn('Seller bank account not configured for Flutterwave transfer', {
            requestId: req.id,
            escrowId: id,
            sellerId: escrow.order.product.sellerId,
          });
        } else {
          // Create Flutterwave bank transfer
          const transferResult = await createFlutterwaveTransfer({
            amount: escrow.amount,
            currency: 'NGN',
            accountNumber: seller.accountNumber,
            accountBank: seller.bankCode,
            accountName: seller.accountName,
            orderId: escrow.orderId,
            sellerId: seller.id,
          });

          logger.info('Flutterwave transfer initiated for escrow release', {
            requestId: req.id,
            escrowId: id,
            transferId: transferResult.data?.id,
            amount: escrow.amount,
            sellerId: seller.id,
            accountNumber: seller.accountNumber,
            bankCode: seller.bankCode,
          });
        }
      } catch (transferError) {
        logger.error('Flutterwave transfer failed during escrow release:', {
          requestId: req.id,
          escrowId: id,
          error: transferError.message,
          sellerId: escrow.order.product.sellerId,
        });
        // Note: Escrow already marked as released, this is a separate operation
      }
    } else {
      logger.warn('Transfer skipped (payment provider not configured or seller has no connected account)', {
        requestId: req.id,
        escrowId: id,
        hasStripeAccount: !!escrow.order.product.seller.stripeAccountId,
        hasFlutterwaveTx: !!escrow.flutterwaveTxRef,
      });
    }

    res.json({
      message: 'Escrow funds released successfully',
      escrow: updatedEscrow,
    });
  } catch (error) {
    logger.error('Release escrow error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to release escrow',
      code: 'RELEASE_ESCROW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Auto-release escrow when order is completed (called internally)
 */
exports.autoReleaseEscrow = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true },
    });

    if (!order || !order.escrow || order.escrow.released) {
      return;
    }

    await prisma.escrow.update({
      where: { id: order.escrow.id },
      data: {
        released: true,
        releasedAt: new Date(),
      },
    });

    logger.info('Escrow auto-released', {
      orderId,
      escrowId: order.escrow.id,
      amount: order.escrow.amount,
    });

    // Auto-transfer funds to seller
    if (process.env.STRIPE_SECRET_KEY && order.product?.seller?.stripeAccountId) {
      try {
        await createTransfer({
          amount: order.escrow.amount,
          currency: 'ngn',
          destination: order.product.seller.stripeAccountId,
          orderId,
          sellerId: order.product.sellerId,
        });
        
        logger.info('Funds auto-transferred to seller via Stripe', {
          orderId,
          sellerId: order.product.sellerId,
        });
      } catch (transferError) {
        logger.error('Auto-transfer failed:', {
          orderId,
          error: transferError.message,
        });
      }
    } else if (order.escrow.flutterwaveTxRef && process.env.FLUTTERWAVE_SECRET_KEY) {
      // Auto-transfer funds to seller via Flutterwave bank transfer
      try {
        // Get seller's bank account information
        const seller = await prisma.user.findUnique({
          where: { id: order.product.sellerId },
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            bankCode: true,
          },
        });

        if (seller && seller.accountNumber && seller.accountName && seller.bankCode) {
          // Create Flutterwave bank transfer
          const transferResult = await createFlutterwaveTransfer({
            amount: order.escrow.amount,
            currency: 'NGN',
            accountNumber: seller.accountNumber,
            accountBank: seller.bankCode,
            accountName: seller.accountName,
            orderId,
            sellerId: seller.id,
          });

          logger.info('Funds auto-transferred to seller via Flutterwave', {
            orderId,
            transferId: transferResult.data?.id,
            amount: order.escrow.amount,
            sellerId: seller.id,
            accountNumber: seller.accountNumber,
            bankCode: seller.bankCode,
          });
        } else {
          logger.warn('Seller bank account not configured for auto-transfer', {
            orderId,
            sellerId: order.product.sellerId,
          });
        }
      } catch (transferError) {
        logger.error('Auto-transfer via Flutterwave failed:', {
          orderId,
          error: transferError.message,
        });
      }
    }
  } catch (error) {
    logger.error('Auto-release escrow error:', { orderId, error: error.message });
  }
};

/**
 * Refund an order
 * POST /api/orders/:id/refund
 */
exports.refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find order with escrow
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        product: {
          include: { seller: true },
        },
        escrow: true,
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

    // Authorization: buyer or admin
    const isBuyer = order.buyerId === userId;
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'Only the buyer or admin can request a refund',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Check order status
    if (!['paid', 'shipped', 'disputed'].includes(order.status)) {
      return res.status(400).json({
        error: true,
        message: 'Order cannot be refunded in current status',
        code: 'INVALID_ORDER_STATUS',
        requestId: req.id,
      });
    }

    // Check if already cancelled/completed
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        error: true,
        message: 'Cannot refund completed or cancelled orders',
        code: 'INVALID_ORDER_STATUS',
        requestId: req.id,
      });
    }

    // Check if escrow exists and has payment intent
    if (!order.escrow || !order.escrow.paymentIntentId) {
      return res.status(400).json({
        error: true,
        message: 'No payment found for this order',
        code: 'NO_PAYMENT',
        requestId: req.id,
      });
    }

    // Process refund with Stripe
    let refund;
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        refund = await createRefund(
          order.escrow.paymentIntentId,
          amount, // Full refund if not specified
          reason || 'requested_by_customer'
        );

        logger.info('Stripe refund processed', {
          requestId: req.id,
          orderId: id,
          refundId: refund.id,
          amount: refund.amount,
        });
      } else {
        // Simulate refund if Stripe not configured
        refund = {
          id: `re_simulated_${Date.now()}`,
          amount: amount || order.totalAmount * 100,
          status: 'succeeded',
          simulated: true,
        };
        logger.warn('Simulated refund (Stripe not configured)', {
          requestId: req.id,
          orderId: id,
        });
      }
    } catch (stripeError) {
      logger.error('Stripe refund error:', {
        requestId: req.id,
        error: stripeError.message,
        orderId: id,
      });

      return res.status(400).json({
        error: true,
        message: 'Refund processing failed',
        code: 'REFUND_ERROR',
        requestId: req.id,
        details: stripeError.message,
      });
    }

    // Update order status to cancelled
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'cancelled' },
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

    logger.info('Order refunded', {
      requestId: req.id,
      orderId: id,
      refundId: refund.id,
      refundedBy: userId,
    });

    // Broadcast update
    broadcastOrderUpdate(updatedOrder);

    res.json({
      message: 'Order refunded successfully',
      order: updatedOrder,
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: refund.status,
      },
    });
  } catch (error) {
    logger.error('Refund order error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to process refund',
      code: 'REFUND_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Create dispute for an order
 * POST /api/orders/:id/dispute
 */
exports.createDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    if (!reason || !description) {
      return res.status(400).json({
        error: true,
        message: 'Reason and description are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
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

    // Authorization: buyer or seller
    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: true,
        message: 'Only the buyer or seller can dispute this order',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Check if order can be disputed
    if (!['paid', 'shipped'].includes(order.status)) {
      return res.status(400).json({
        error: true,
        message: 'Order cannot be disputed in current status',
        code: 'INVALID_ORDER_STATUS',
        requestId: req.id,
      });
    }

    // Update order status to disputed
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'disputed' },
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

    // Create dispute record in database
    const dispute = await prisma.dispute.create({
      data: {
        orderId: id,
        userId: userId,
        reason,
        description,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    logger.info('Order dispute created', {
      requestId: req.id,
      orderId: id,
      disputeId: dispute.id,
      disputedBy: userId,
      disputedByRole: isBuyer ? 'buyer' : 'seller',
      reason,
      description,
    });

    // Broadcast update
    broadcastOrderUpdate(updatedOrder);

    // Send email notifications (async, don't block response)
    sendDisputeCreatedNotification(updatedOrder, reason);

    res.json({
      message: 'Dispute created successfully. An admin will review your case.',
      order: updatedOrder,
      dispute: {
        id: dispute.id,
        orderId: dispute.orderId,
        userId: dispute.userId,
        reason: dispute.reason,
        description: dispute.description,
        status: dispute.status,
        createdAt: dispute.createdAt,
        user: dispute.user,
      },
    });
  } catch (error) {
    logger.error('Create dispute error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to create dispute',
      code: 'DISPUTE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Test bank transfer (admin only)
 * POST /api/orders/test-transfer
 */
exports.testTransfer = async (req, res) => {
  try {
    const { amount, accountNumber, accountName, bankCode } = req.body;

    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      return res.status(400).json({
        error: true,
        message: 'Flutterwave not configured',
        code: 'FLUTTERWAVE_NOT_CONFIGURED',
        requestId: req.id,
      });
    }

    // Create test transfer
    const transferResult = await createFlutterwaveTransfer({
      amount,
      currency: 'NGN',
      accountNumber,
      accountBank: bankCode,
      accountName,
      orderId: `TEST-${Date.now()}`,
      sellerId: 'test-admin',
    });

    logger.info('Test Flutterwave transfer initiated', {
      requestId: req.id,
      transferId: transferResult.data?.id,
      amount,
      accountNumber,
      bankCode,
    });

    res.json({
      message: 'Test transfer initiated successfully',
      transfer: {
        id: transferResult.data?.id,
        reference: transferResult.data?.reference,
        status: transferResult.data?.status,
        amount,
        accountNumber,
        accountName,
        bankCode,
      },
    });
  } catch (error) {
    logger.error('Test transfer error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Test transfer failed',
      code: 'TEST_TRANSFER_ERROR',
      requestId: req.id,
      details: error.message,
    });
  }
};

module.exports = exports;
