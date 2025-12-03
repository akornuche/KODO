const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Recently Viewed Controller
 * Tracks and displays browsing history
 */

/**
 * Track product view
 * POST /api/recently-viewed/:productId
 */
exports.trackView = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
      });
    }

    // Check if already viewed recently (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await prisma.recentlyViewed.findFirst({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId }),
        viewedAt: { gte: oneHourAgo },
      },
    });

    if (existing) {
      // Update view time
      await prisma.recentlyViewed.update({
        where: { id: existing.id },
        data: { viewedAt: new Date() },
      });
    } else {
      // Create new view record
      await prisma.recentlyViewed.create({
        data: {
          productId,
          userId,
          sessionId,
        },
      });
    }

    res.json({
      success: true,
      message: 'View tracked',
    });
  } catch (error) {
    logger.error('Track view error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to track view',
    });
  }
};

/**
 * Get recently viewed products
 * GET /api/recently-viewed
 */
exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];
    const { limit = 20 } = req.query;

    const views = await prisma.recentlyViewed.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { viewedAt: 'desc' },
      take: parseInt(limit),
      distinct: ['productId'],
    });

    const productIds = views.map(v => v.productId);

    if (productIds.length === 0) {
      return res.json({
        success: true,
        products: [],
      });
    }

    // Get product details
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        images: {
          take: 1,
        },
      },
    });

    // Maintain order from views
    const orderedProducts = productIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean);

    res.json({
      success: true,
      products: orderedProducts,
    });
  } catch (error) {
    logger.error('Get recently viewed error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve recently viewed products',
    });
  }
};

/**
 * Clear recently viewed
 * DELETE /api/recently-viewed
 */
exports.clearRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];

    await prisma.recentlyViewed.deleteMany({
      where: userId ? { userId } : { sessionId },
    });

    logger.info('Recently viewed cleared', { userId, sessionId });

    res.json({
      success: true,
      message: 'Recently viewed cleared',
    });
  } catch (error) {
    logger.error('Clear recently viewed error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to clear recently viewed',
    });
  }
};

module.exports = exports;
