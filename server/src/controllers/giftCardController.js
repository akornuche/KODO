const prisma = require('../../config/db');

/**
 * Create gift card
 * @route POST /api/gift-cards/create
 */
const createGiftCard = async (req, res) => {
  try {
    const { amount, recipientEmail, recipientName, message, design } = req.body;

    if (amount < 10 || amount > 1000) {
      return res.status(400).json({ message: 'Amount must be between $10 and $1000' });
    }

    // Generate unique code
    const code = `GC-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Create gift card (simplified - would integrate with payment processor)
    const giftCard = {
      id: Date.now().toString(),
      code,
      amount,
      balance: amount,
      purchasedBy: req.user.id,
      recipientEmail,
      recipientName,
      message,
      design: design || 'default',
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      createdAt: new Date(),
    };

    res.status(201).json({
      message: 'Gift card created successfully',
      giftCard,
      note: 'Gift card code has been sent to recipient email',
    });
  } catch (error) {
    console.error('Create gift card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Check gift card balance
 * @route GET /api/gift-cards/balance/:code
 */
const checkBalance = async (req, res) => {
  try {
    const { code } = req.params;

    // In production, fetch from database
    res.json({
      code,
      balance: 0,
      status: 'not_found',
      message: 'Gift card not found',
    });
  } catch (error) {
    console.error('Check balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Apply gift card to order
 * @route POST /api/gift-cards/apply
 */
const applyGiftCard = async (req, res) => {
  try {
    const { code, orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // In production, validate gift card and apply discount
    res.json({
      message: 'Gift card applied successfully',
      discountApplied: 0,
      newTotal: order.totalAmount,
    });
  } catch (error) {
    console.error('Apply gift card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user's gift cards
 * @route GET /api/gift-cards/my-cards
 */
const getMyGiftCards = async (req, res) => {
  try {
    const userId = req.user.id;

    // In production, fetch from database
    res.json({
      purchased: [],
      received: [],
    });
  } catch (error) {
    console.error('Get my gift cards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGiftCard,
  checkBalance,
  applyGiftCard,
  getMyGiftCards,
};
