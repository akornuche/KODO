const prisma = require('../../config/db');

/**
 * Get product badges
 * @route GET /api/badges/product/:productId
 */
const getProductBadges = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: {
          where: {
            order: {
              status: { in: ['completed', 'delivered'] },
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const badges = [];

    // Bestseller badge (more than 50 sales in 30 days)
    const salesCount = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    if (salesCount >= 50) {
      badges.push({ type: 'bestseller', label: 'Bestseller', color: '#FFD700' });
    }

    // New arrival badge (less than 30 days old)
    const daysSinceCreation = Math.floor((Date.now() - new Date(product.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceCreation <= 30) {
      badges.push({ type: 'new', label: 'New Arrival', color: '#4CAF50' });
    }

    // Sale badge (has discount)
    // if (product.discount > 0) { // Uncomment if field exists
    //   badges.push({ type: 'sale', label: `${product.discount}% OFF`, color: '#FF5722' });
    // }

    // Limited stock badge
    if (product.stockQuantity <= 10 && product.stockQuantity > 0) {
      badges.push({ type: 'limited', label: 'Limited Stock', color: '#FF9800' });
    }

    // High rated badge
    if (product.avgRating >= 4.5) {
      badges.push({ type: 'top_rated', label: 'Top Rated', color: '#2196F3' });
    }

    // Trending badge (high views recently)
    const recentViews = await prisma.recentlyViewed.count({
      where: {
        productId,
        viewedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentViews >= 100) {
      badges.push({ type: 'trending', label: 'Trending', color: '#E91E63' });
    }

    res.json({
      productId,
      badges,
    });
  } catch (error) {
    console.error('Get product badges error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Set custom badge (admin/seller)
 * @route POST /api/badges/custom
 */
const setCustomBadge = async (req, res) => {
  try {
    const { productId, label, color, expiresAt } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Verify seller or admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (product.sellerId !== req.user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const badge = {
      productId,
      type: 'custom',
      label,
      color,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
    };

    res.status(201).json({
      message: 'Custom badge created',
      badge,
    });
  } catch (error) {
    console.error('Set custom badge error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProductBadges,
  setCustomBadge,
};
