const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Wishlist Controller
 * Handles wishlist operations: add, remove, get items
 */

/**
 * Get user's wishlist
 * GET /api/wishlist
 */
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  businessName: true,
                  sellerNiche: true,
                },
              },
              images: {
                take: 1,
                orderBy: { order: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.wishlist.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      items,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error('Get wishlist error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve wishlist',
    });
  }
};

/**
 * Add product to wishlist
 * POST /api/wishlist
 */
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({
        error: true,
        message: 'Product ID is required',
      });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
      });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: true,
        message: 'Product already in wishlist',
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId,
        notes,
      },
      include: {
        product: {
          include: {
            images: {
              take: 1,
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    logger.info('Product added to wishlist', { userId, productId });

    res.json({
      success: true,
      message: 'Product added to wishlist',
      item: wishlistItem,
    });
  } catch (error) {
    logger.error('Add to wishlist error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to add to wishlist',
    });
  }
};

/**
 * Remove product from wishlist
 * DELETE /api/wishlist/:productId
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const deleted = await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        error: true,
        message: 'Product not found in wishlist',
      });
    }

    logger.info('Product removed from wishlist', { userId, productId });

    res.json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    logger.error('Remove from wishlist error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to remove from wishlist',
    });
  }
};

/**
 * Check if product is in wishlist
 * GET /api/wishlist/check/:productId
 */
exports.checkWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const item = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    res.json({
      success: true,
      inWishlist: !!item,
    });
  } catch (error) {
    logger.error('Check wishlist error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to check wishlist',
    });
  }
};

/**
 * Clear entire wishlist
 * DELETE /api/wishlist
 */
exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await prisma.wishlist.deleteMany({
      where: { userId },
    });

    logger.info('Wishlist cleared', { userId, count: deleted.count });

    res.json({
      success: true,
      message: 'Wishlist cleared',
      deletedCount: deleted.count,
    });
  } catch (error) {
    logger.error('Clear wishlist error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to clear wishlist',
    });
  }
};

module.exports = exports;
