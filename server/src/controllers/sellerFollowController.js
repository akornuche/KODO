const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Seller Follow Controller
 * Handles seller follow/unfollow functionality
 */

/**
 * Follow seller
 * POST /api/sellers/:sellerId/follow
 */
exports.followSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;

    if (userId === sellerId) {
      return res.status(400).json({
        error: true,
        message: 'Cannot follow yourself',
      });
    }

    // Check if seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return res.status(404).json({
        error: true,
        message: 'Seller not found',
      });
    }

    // Check if already following
    const existingFollow = await prisma.sellerFollow.findUnique({
      where: {
        userId_sellerId: {
          userId,
          sellerId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({
        error: true,
        message: 'Already following this seller',
      });
    }

    // Create follow
    await prisma.sellerFollow.create({
      data: {
        userId,
        sellerId,
      },
    });

    logger.info('Seller followed', { userId, sellerId });

    res.json({
      success: true,
      message: 'Seller followed successfully',
    });
  } catch (error) {
    logger.error('Follow seller error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to follow seller',
    });
  }
};

/**
 * Unfollow seller
 * DELETE /api/sellers/:sellerId/follow
 */
exports.unfollowSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;

    const follow = await prisma.sellerFollow.findUnique({
      where: {
        userId_sellerId: {
          userId,
          sellerId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({
        error: true,
        message: 'Not following this seller',
      });
    }

    await prisma.sellerFollow.delete({
      where: {
        userId_sellerId: {
          userId,
          sellerId,
        },
      },
    });

    logger.info('Seller unfollowed', { userId, sellerId });

    res.json({
      success: true,
      message: 'Seller unfollowed successfully',
    });
  } catch (error) {
    logger.error('Unfollow seller error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to unfollow seller',
    });
  }
};

/**
 * Get followed sellers
 * GET /api/sellers/following
 */
exports.getFollowedSellers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      prisma.sellerFollow.findMany({
        where: { userId },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              businessName: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.sellerFollow.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      sellers: follows.map(f => f.seller),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get followed sellers error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve followed sellers',
    });
  }
};

/**
 * Get seller followers
 * GET /api/sellers/:sellerId/followers
 */
exports.getSellerFollowers = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.sellerFollow.findMany({
        where: { sellerId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.sellerFollow.count({
        where: { sellerId },
      }),
    ]);

    res.json({
      success: true,
      followers: followers.map(f => f.user),
      count: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get seller followers error:', { error: error.message, sellerId: req.params.sellerId });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve followers',
    });
  }
};

/**
 * Check if following seller
 * GET /api/sellers/:sellerId/follow/check
 */
exports.checkIfFollowing = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;

    const follow = await prisma.sellerFollow.findUnique({
      where: {
        userId_sellerId: {
          userId,
          sellerId,
        },
      },
    });

    res.json({
      success: true,
      isFollowing: !!follow,
    });
  } catch (error) {
    logger.error('Check if following error:', { error: error.message, sellerId: req.params.sellerId });
    res.status(500).json({
      error: true,
      message: 'Failed to check follow status',
    });
  }
};

/**
 * Get new products from followed sellers
 * GET /api/sellers/following/new-products
 */
exports.getNewProductsFromFollowedSellers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Get followed sellers
    const follows = await prisma.sellerFollow.findMany({
      where: { userId },
      select: { sellerId: true },
    });

    if (follows.length === 0) {
      return res.json({
        success: true,
        products: [],
      });
    }

    const sellerIds = follows.map(f => f.sellerId);

    // Get recent products from these sellers
    const products = await prisma.product.findMany({
      where: {
        sellerId: { in: sellerIds },
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
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    logger.error('Get new products from followed sellers error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve products',
    });
  }
};

module.exports = exports;
