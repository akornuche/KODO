const prisma = require('../../config/db');

/**
 * Create subscription plan
 * @route POST /api/subscriptions/plans
 */
const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      productId,
      interval, // 'weekly', 'monthly', 'quarterly', 'yearly'
      intervalCount,
      discountPercentage,
    } = req.body;

    // Verify product exists and user is seller
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.sellerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subscriptionPrice = product.price * (1 - (discountPercentage || 0) / 100);

    // Create subscription plan (simplified - would use Stripe/PayPal in production)
    const plan = {
      id: Date.now().toString(),
      productId,
      interval,
      intervalCount: intervalCount || 1,
      price: subscriptionPrice,
      originalPrice: product.price,
      discountPercentage,
      savings: product.price - subscriptionPrice,
      createdAt: new Date(),
    };

    res.status(201).json({
      message: 'Subscription plan created',
      plan,
    });
  } catch (error) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Subscribe to product
 * @route POST /api/subscriptions/subscribe
 */
const subscribe = async (req, res) => {
  try {
    const {
      productId,
      interval,
      shippingAddress,
      paymentMethodId,
    } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create subscription (simplified)
    const subscription = {
      id: `sub_${Date.now()}`,
      userId: req.user.id,
      productId,
      interval,
      nextDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      shippingAddress,
      createdAt: new Date(),
    };

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription,
      nextDelivery: subscription.nextDelivery,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user subscriptions
 * @route GET /api/subscriptions/my-subscriptions
 */
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // In production, fetch from subscriptions table
    res.json({
      subscriptions: [],
      message: 'No active subscriptions',
    });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Cancel subscription
 * @route DELETE /api/subscriptions/:subscriptionId
 */
const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    res.json({
      message: 'Subscription cancelled successfully',
      subscriptionId,
      endDate: new Date(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSubscriptionPlan,
  subscribe,
  getUserSubscriptions,
  cancelSubscription,
};
