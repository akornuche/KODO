const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Get user's favorites/watchlist
 * GET /api/favorites
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Since Favorite model doesn't exist yet, use notification preferences as proxy
    // In production, create proper Favorite model
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        notificationPreferences: true,
      },
    });

    // Get user's notification preferences which can include favorite product IDs
    const favorites = user?.notificationPreferences?.favorites || [];

    // Fetch product details for favorites
    const products = await prisma.product.findMany({
      where: {
        id: { in: favorites },
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        images: true,
      },
      skip,
      take: limitNum,
    });

    const total = favorites.length;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      favorites: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (error) {
    logger.error('Get favorites error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to get favorites',
      code: 'GET_FAVORITES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Add product to favorites
 * POST /api/favorites/:productId
 */
exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Update user preferences to include favorite
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences || {};
    const favorites = preferences.favorites || [];

    if (!favorites.includes(productId)) {
      favorites.push(productId);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: {
            ...preferences,
            favorites,
          },
        },
      });
    }

    logger.info('Product added to favorites', {
      requestId: req.id,
      userId,
      productId,
    });

    res.json({
      message: 'Product added to favorites',
      productId,
      isFavorite: true,
    });
  } catch (error) {
    logger.error('Add favorite error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to add favorite',
      code: 'ADD_FAVORITE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Remove product from favorites
 * DELETE /api/favorites/:productId
 */
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences || {};
    const favorites = preferences.favorites || [];

    const updatedFavorites = favorites.filter(id => id !== productId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: {
          ...preferences,
          favorites: updatedFavorites,
        },
      },
    });

    logger.info('Product removed from favorites', {
      requestId: req.id,
      userId,
      productId,
    });

    res.json({
      message: 'Product removed from favorites',
      productId,
      isFavorite: false,
    });
  } catch (error) {
    logger.error('Remove favorite error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to remove favorite',
      code: 'REMOVE_FAVORITE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Check if product is favorited
 * GET /api/favorites/:productId/check
 */
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const preferences = user?.notificationPreferences || {};
    const favorites = preferences.favorites || [];
    const isFavorite = favorites.includes(productId);

    res.json({
      productId,
      isFavorite,
    });
  } catch (error) {
    logger.error('Check favorite error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to check favorite status',
      code: 'CHECK_FAVORITE_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;
