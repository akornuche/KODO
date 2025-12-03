const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Create a review for a completed order
 * POST /api/reviews
 */
exports.createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validation
    if (!orderId || !rating) {
      return res.status(400).json({
        error: true,
        message: 'Order ID and rating are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: true,
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING',
        requestId: req.id,
      });
    }

    // Check if order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        review: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Only buyer can review
    if (order.buyerId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'Only the buyer can review this order',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      return res.status(400).json({
        error: true,
        message: 'Can only review completed orders',
        code: 'ORDER_NOT_COMPLETED',
        requestId: req.id,
      });
    }

    // Check if review already exists
    if (order.review) {
      return res.status(409).json({
        error: true,
        message: 'Review already exists for this order',
        code: 'REVIEW_EXISTS',
        requestId: req.id,
      });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId,
        productId: order.productId,
        userId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Update product average rating and review count
    await updateProductRating(order.productId);

    logger.info('Review created', {
      requestId: req.id,
      reviewId: review.id,
      orderId,
      productId: order.productId,
      rating,
    });

    res.status(201).json({
      message: 'Review created successfully',
      review,
    });
  } catch (error) {
    logger.error('Create review error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to create review',
      code: 'CREATE_REVIEW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update a review
 * PUT /api/reviews/:id
 */
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Find review
    const existingReview = await prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      return res.status(404).json({
        error: true,
        message: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check ownership
    if (existingReview.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only update your own reviews',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: true,
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING',
        requestId: req.id,
      });
    }

    // Build update data
    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    // Update review
    const review = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Update product rating if rating changed
    if (rating !== undefined) {
      await updateProductRating(review.productId);
    }

    logger.info('Review updated', {
      requestId: req.id,
      reviewId: id,
      userId,
    });

    res.json({
      message: 'Review updated successfully',
      review,
    });
  } catch (error) {
    logger.error('Update review error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update review',
      code: 'UPDATE_REVIEW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find review
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return res.status(404).json({
        error: true,
        message: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check ownership or admin
    if (review.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only delete your own reviews',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    const productId = review.productId;

    // Delete review
    await prisma.review.delete({
      where: { id },
    });

    // Update product rating
    await updateProductRating(productId);

    logger.info('Review deleted', {
      requestId: req.id,
      reviewId: id,
      userId,
    });

    res.json({
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('Delete review error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to delete review',
      code: 'DELETE_REVIEW_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get reviews for a product
 * GET /api/reviews/product/:productId
 */
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const validSortFields = ['createdAt', 'rating'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip,
        take: limitNum,
        orderBy: { [orderByField]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    logger.info(`Retrieved ${reviews.length} reviews for product ${productId}`, {
      requestId: req.id,
      productId,
      total,
    });

    res.json({
      items: reviews,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + reviews.length < total,
      },
    });
  } catch (error) {
    logger.error('Get product reviews error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve reviews',
      code: 'GET_REVIEWS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get reviews by user
 * GET /api/reviews/user/:userId
 */
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              images: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { userId } }),
    ]);

    logger.info(`Retrieved ${reviews.length} reviews for user ${userId}`, {
      requestId: req.id,
      userId,
      total,
    });

    res.json({
      items: reviews,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + reviews.length < total,
      },
    });
  } catch (error) {
    logger.error('Get user reviews error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve reviews',
      code: 'GET_REVIEWS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Helper function to update product rating
 */
async function updateProductRating(productId) {
  try {
    const result = await prisma.review.aggregate({
      where: { productId },
      _avg: {
        rating: true,
      },
      _count: true,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: result._avg.rating || 0,
        reviewCount: result._count,
      },
    });

    logger.info('Product rating updated', {
      productId,
      averageRating: result._avg.rating,
      reviewCount: result._count,
    });
  } catch (error) {
    logger.error('Update product rating error:', {
      productId,
      error: error.message,
    });
  }
}

module.exports = exports;
