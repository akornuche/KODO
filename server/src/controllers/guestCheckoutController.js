const prisma = require('../../config/db');
const bcrypt = require('bcrypt');

/**
 * Create guest checkout session
 * @route POST /api/guest-checkout/session
 */
const createGuestSession = async (req, res) => {
  try {
    const { email, name, phone } = req.body;

    // Generate guest session token
    const guestToken = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store guest info temporarily (in production, use Redis/session store)
    const guestData = {
      token: guestToken,
      email,
      name,
      phone,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    res.json({
      message: 'Guest session created',
      guestToken,
      expiresIn: '24 hours',
    });
  } catch (error) {
    console.error('Create guest session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Guest checkout
 * @route POST /api/guest-checkout/order
 */
const guestCheckout = async (req, res) => {
  try {
    const {
      guestToken,
      email,
      name,
      phone,
      shippingAddress,
      billingAddress,
      items, // [{ productId, quantity, variantId? }]
      paymentMethod,
      paymentDetails,
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Get products and calculate total
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== items.length) {
      return res.status(400).json({ message: 'Some products not found' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const itemPrice = product.price * item.quantity;
      totalAmount += itemPrice;

      orderItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create temporary guest user or use existing
    let guestUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!guestUser) {
      // Create guest user with random password
      const randomPassword = Math.random().toString(36).substring(7);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      guestUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          phone,
          password: hashedPassword,
          role: 'buyer',
          // isGuest: true, // Uncomment if field exists
        },
      });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId: guestUser.id,
        sellerId: products[0].sellerId, // Simplified: assume single seller
        totalAmount,
        status: 'pending',
        paymentMethod,
        paymentStatus: 'pending',
        shippingAddress,
        billingAddress,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    res.status(201).json({
      message: 'Order created successfully',
      order,
      guestUser: {
        id: guestUser.id,
        email: guestUser.email,
        name: guestUser.name,
      },
      note: 'Check your email for order tracking link. You can create an account later to view all orders.',
    });
  } catch (error) {
    console.error('Guest checkout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Convert guest account to registered
 * @route POST /api/guest-checkout/convert
 */
const convertGuestAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already converted
    // if (user.isGuest === false) { // Uncomment if field exists
    //   return res.status(400).json({ message: 'Account already registered' });
    // }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // isGuest: false, // Uncomment if field exists
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Account successfully converted to registered user',
      userId: user.id,
    });
  } catch (error) {
    console.error('Convert guest account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Track guest order
 * @route GET /api/guest-checkout/track/:orderId/:email
 */
const trackGuestOrder = async (req, res) => {
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
            estimatedDelivery: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items,
      delivery: order.delivery,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error('Track guest order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGuestSession,
  guestCheckout,
  convertGuestAccount,
  trackGuestOrder,
};
