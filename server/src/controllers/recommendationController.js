const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Product Recommendation Controller
 * Handles product recommendations and personalization
 */

/**
 * Get recommendations for user
 * GET /api/recommendations
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recommendations = await prisma.productRecommendation.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            seller: {
              select: {
                firstName: true,
                lastName: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { score: 'desc' },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    logger.error('Get recommendations error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve recommendations',
    });
  }
};

/**
 * Get similar products
 * GET /api/recommendations/similar/:productId
 */
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;

    // Get the product to find similar ones
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
      });
    }

    // Find similar products based on category and price range
    const priceMin = product.price * 0.7;
    const priceMax = product.price * 1.3;

    const similarProducts = await prisma.product.findMany({
      where: {
        id: { not: productId },
        category: product.category,
        price: {
          gte: priceMin,
          lte: priceMax,
        },
        isActive: true,
      },
      include: {
        images: true,
        seller: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
      },
      take: parseInt(limit),
      orderBy: { viewCount: 'desc' },
    });

    res.json({
      success: true,
      products: similarProducts,
    });
  } catch (error) {
    logger.error('Get similar products error:', { error: error.message, productId: req.params.productId });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve similar products',
    });
  }
};

/**
 * Get frequently bought together
 * GET /api/recommendations/frequently-bought/:productId
 */
exports.getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    // Find products that were ordered together with this product
    const ordersWithProduct = await prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    const orderIds = ordersWithProduct.map(o => o.orderId);

    if (orderIds.length === 0) {
      return res.json({
        success: true,
        products: [],
      });
    }

    // Find other products in those orders
    const otherProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: {
        _count: { productId: 'desc' },
      },
      take: parseInt(limit),
    });

    // Get product details
    const productIds = otherProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        images: true,
        seller: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
      },
    });

    // Add frequency count to products
    const productsWithCount = products.map(product => {
      const count = otherProducts.find(p => p.productId === product.id)?._count.productId || 0;
      return { ...product, boughtTogetherCount: count };
    });

    res.json({
      success: true,
      products: productsWithCount,
    });
  } catch (error) {
    logger.error('Get frequently bought together error:', { error: error.message, productId: req.params.productId });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve frequently bought together products',
    });
  }
};

/**
 * Get recommendations based on browsing history
 * GET /api/recommendations/based-on-history
 */
exports.getRecommendationsBasedOnHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get user's recent product views
    const recentViews = await prisma.productView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 20,
      select: {
        product: {
          select: { category: true },
        },
      },
    });

    if (recentViews.length === 0) {
      return res.json({
        success: true,
        products: [],
      });
    }

    // Get categories the user has been viewing
    const categories = [...new Set(recentViews.map(v => v.product.category))];

    // Find popular products in those categories
    const recommendations = await prisma.product.findMany({
      where: {
        category: { in: categories },
        isActive: true,
      },
      include: {
        images: true,
        seller: {
          select: {
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
      },
      orderBy: [
        { viewCount: 'desc' },
        { rating: 'desc' },
      ],
      take: parseInt(limit),
    });

    res.json({
      success: true,
      products: recommendations,
    });
  } catch (error) {
    logger.error('Get recommendations based on history error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve recommendations',
    });
  }
};

/**
 * Track product view
 * POST /api/recommendations/track-view
 */
exports.trackProductView = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // Create product view record
    await prisma.productView.create({
      data: {
        userId,
        productId,
      },
    });

    // Increment product view count
    await prisma.product.update({
      where: { id: productId },
      data: {
        viewCount: { increment: 1 },
      },
    });

    // Generate recommendation asynchronously (don't wait)
    generateRecommendation(userId, productId).catch(err =>
      logger.error('Generate recommendation error:', { error: err.message })
    );

    res.json({
      success: true,
      message: 'View tracked successfully',
    });
  } catch (error) {
    logger.error('Track product view error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to track view',
    });
  }
};

/**
 * Generate recommendation for user (internal function)
 */
async function generateRecommendation(userId, productId) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) return;

    // Find similar products
    const priceMin = product.price * 0.7;
    const priceMax = product.price * 1.3;

    const similarProducts = await prisma.product.findMany({
      where: {
        id: { not: productId },
        category: product.category,
        price: {
          gte: priceMin,
          lte: priceMax,
        },
        isActive: true,
      },
      take: 5,
      orderBy: { rating: 'desc' },
    });

    // Create recommendations
    const recommendations = similarProducts.map(p => ({
      userId,
      productId: p.id,
      type: 'SIMILAR_PRODUCTS',
      score: calculateRecommendationScore(product, p),
    }));

    // Upsert recommendations (update if exists, create if not)
    for (const rec of recommendations) {
      await prisma.productRecommendation.upsert({
        where: {
          userId_productId: {
            userId: rec.userId,
            productId: rec.productId,
          },
        },
        update: {
          score: rec.score,
        },
        create: rec,
      });
    }

    logger.info('Recommendations generated', { userId, productId, count: recommendations.length });
  } catch (error) {
    logger.error('Generate recommendation error:', { error: error.message, userId, productId });
  }
}

/**
 * Calculate recommendation score
 */
function calculateRecommendationScore(originalProduct, similarProduct) {
  let score = 50; // Base score

  // Similar price range increases score
  const priceDiff = Math.abs(originalProduct.price - similarProduct.price) / originalProduct.price;
  score += (1 - priceDiff) * 20;

  // Higher rating increases score
  if (similarProduct.rating) {
    score += similarProduct.rating * 5;
  }

  // More views increases score slightly
  if (similarProduct.viewCount > 100) {
    score += 5;
  }

  return Math.min(Math.round(score), 100);
}

module.exports = exports;
