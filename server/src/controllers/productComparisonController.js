const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Product Comparison Controller
 * Handles product comparison functionality
 */

/**
 * Save product comparison
 * POST /api/product-comparison
 */
exports.saveComparison = async (req, res) => {
  try {
    const { productIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        error: true,
        message: 'At least 2 products are required for comparison',
      });
    }

    if (productIds.length > 10) {
      return res.status(400).json({
        error: true,
        message: 'Maximum 10 products can be compared',
      });
    }

    const comparison = await prisma.productComparison.create({
      data: {
        userId,
        productIds: JSON.stringify(productIds),
      },
    });

    logger.info('Product comparison saved', { userId, productCount: productIds.length });

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    logger.error('Save comparison error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to save comparison',
    });
  }
};

/**
 * Get user's comparisons
 * GET /api/product-comparison
 */
exports.getUserComparisons = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comparisons, total] = await Promise.all([
      prisma.productComparison.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.productComparison.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      comparisons: comparisons.map(c => ({
        ...c,
        productIds: JSON.parse(c.productIds),
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get comparisons error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve comparisons',
    });
  }
};

/**
 * Compare products
 * POST /api/product-comparison/compare
 */
exports.compareProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        error: true,
        message: 'At least 2 products are required for comparison',
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            sellerBadges: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        variants: true,
        images: {
          take: 1,
        },
      },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        error: true,
        message: 'One or more products not found',
      });
    }

    // Calculate comparison metrics
    const comparison = products.map(product => {
      const reviewRatings = product.reviews.map(r => r.rating);
      const avgRating = reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : 0;

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        condition: product.condition,
        brand: product.brand,
        category: product.category,
        location: product.location,
        stockQuantity: product.stockQuantity,
        isDigital: product.isDigital,
        weight: product.weight,
        dimensions: product.dimensions,
        rating: avgRating,
        reviewCount: product.reviews.length,
        variantCount: product.variants.length,
        seller: product.seller,
        image: product.images[0]?.url,
        createdAt: product.createdAt,
      };
    });

    // Find best value
    const lowestPrice = Math.min(...comparison.map(p => p.price));
    const highestRating = Math.max(...comparison.map(p => p.rating));

    res.json({
      success: true,
      comparison,
      insights: {
        lowestPrice,
        highestRating,
        lowestPriceProduct: comparison.find(p => p.price === lowestPrice)?.id,
        highestRatingProduct: comparison.find(p => p.rating === highestRating)?.id,
      },
    });
  } catch (error) {
    logger.error('Compare products error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to compare products',
    });
  }
};

/**
 * Delete comparison
 * DELETE /api/product-comparison/:id
 */
exports.deleteComparison = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comparison = await prisma.productComparison.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!comparison) {
      return res.status(404).json({
        error: true,
        message: 'Comparison not found',
      });
    }

    await prisma.productComparison.delete({
      where: { id },
    });

    logger.info('Comparison deleted', { id, userId });

    res.json({
      success: true,
      message: 'Comparison deleted',
    });
  } catch (error) {
    logger.error('Delete comparison error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete comparison',
    });
  }
};

module.exports = exports;
