const prisma = require('../../config/db');

/**
 * Get detailed order tracking
 * @route GET /api/order-tracking/:orderId
 */
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        delivery: {
          include: {
            courier: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify user has access to this order
    if (userId && order.buyerId !== userId && order.sellerId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build tracking timeline
    const timeline = [];

    timeline.push({
      status: 'pending',
      label: 'Order Placed',
      timestamp: order.createdAt,
      completed: true,
      description: `Order #${order.id.slice(0, 8)} has been placed`,
    });

    if (order.status !== 'pending') {
      timeline.push({
        status: 'confirmed',
        label: 'Order Confirmed',
        timestamp: order.updatedAt,
        completed: ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed'].includes(order.status),
        description: 'Seller confirmed your order',
      });
    }

    if (['processing', 'shipped', 'out_for_delivery', 'delivered', 'completed'].includes(order.status)) {
      timeline.push({
        status: 'processing',
        label: 'Processing',
        timestamp: order.updatedAt,
        completed: true,
        description: 'Order is being prepared',
      });
    }

    if (['shipped', 'out_for_delivery', 'delivered', 'completed'].includes(order.status)) {
      timeline.push({
        status: 'shipped',
        label: 'Shipped',
        timestamp: order.delivery?.pickedUpAt || order.updatedAt,
        completed: true,
        description: order.delivery?.trackingNumber 
          ? `Tracking: ${order.delivery.trackingNumber}`
          : 'Package has been shipped',
      });
    }

    if (['out_for_delivery', 'delivered', 'completed'].includes(order.status)) {
      timeline.push({
        status: 'out_for_delivery',
        label: 'Out for Delivery',
        timestamp: order.delivery?.updatedAt || order.updatedAt,
        completed: true,
        description: order.delivery?.courier 
          ? `Courier: ${order.delivery.courier.name}`
          : 'Package is out for delivery',
      });
    }

    if (['delivered', 'completed'].includes(order.status)) {
      timeline.push({
        status: 'delivered',
        label: 'Delivered',
        timestamp: order.delivery?.deliveredAt || order.updatedAt,
        completed: true,
        description: 'Package has been delivered',
      });
    }

    // Estimated delivery date (7 days from order date if not delivered)
    let estimatedDelivery = null;
    if (!['delivered', 'completed', 'cancelled', 'refunded'].includes(order.status)) {
      const orderDate = new Date(order.createdAt);
      estimatedDelivery = new Date(orderDate.setDate(orderDate.getDate() + 7));
    }

    res.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items,
        shippingAddress: order.shippingAddress,
      },
      timeline,
      estimatedDelivery,
      delivery: order.delivery ? {
        trackingNumber: order.delivery.trackingNumber,
        courier: order.delivery.courier,
        status: order.delivery.status,
        currentLocation: order.delivery.currentLocation,
      } : null,
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get public order tracking (no auth required)
 * @route GET /api/order-tracking/public/:orderId/:email
 */
const getPublicOrderTracking = async (req, res) => {
  try {
    const { orderId, email } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        buyer: {
          email: email.toLowerCase(),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        delivery: {
          select: {
            trackingNumber: true,
            status: true,
            currentLocation: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or email does not match' });
    }

    // Return limited information for public tracking
    res.json({
      orderId: order.id,
      status: order.status,
      itemCount: order.items.length,
      total: order.totalAmount,
      createdAt: order.createdAt,
      estimatedDelivery: new Date(new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000),
      tracking: order.delivery ? {
        trackingNumber: order.delivery.trackingNumber,
        status: order.delivery.status,
        currentLocation: order.delivery.currentLocation,
      } : null,
    });
  } catch (error) {
    console.error('Get public order tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update order status (seller/admin)
 * @route PUT /api/order-tracking/:orderId/status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify user is seller or admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (order.sellerId !== req.user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Valid status transitions
    const validStatuses = [
      'pending', 'confirmed', 'processing', 'shipped',
      'out_for_delivery', 'delivered', 'completed', 'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Create notification for buyer
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'order_status',
        title: 'Order Status Updated',
        message: `Your order #${orderId.slice(0, 8)} is now ${status}`,
        relatedId: orderId,
      },
    }).catch(err => console.error('Notification creation failed:', err));

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOrderTracking,
  getPublicOrderTracking,
  updateOrderStatus,
};
