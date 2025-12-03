const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Review Photo Controller
 * Handles photo uploads for product reviews
 */

/**
 * Add photos to review
 * POST /api/reviews/:reviewId/photos
 */
exports.addReviewPhotos = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { photos } = req.body; // Array of {url, thumbnailUrl, publicId}
    const userId = req.user.id;

    // Verify review belongs to user
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
      },
    });

    if (!review) {
      return res.status(404).json({
        error: true,
        message: 'Review not found or unauthorized',
      });
    }

    // Create photo records
    const reviewPhotos = await prisma.reviewPhoto.createMany({
      data: photos.map(photo => ({
        reviewId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        publicId: photo.publicId,
      })),
    });

    logger.info('Review photos added', { reviewId, count: photos.length, userId });

    res.json({
      success: true,
      message: `${photos.length} photos added`,
      count: reviewPhotos.count,
    });
  } catch (error) {
    logger.error('Add review photos error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to add review photos',
    });
  }
};

/**
 * Get review photos
 * GET /api/reviews/:reviewId/photos
 */
exports.getReviewPhotos = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const photos = await prisma.reviewPhoto.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      photos,
    });
  } catch (error) {
    logger.error('Get review photos error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve review photos',
    });
  }
};

/**
 * Delete review photo
 * DELETE /api/review-photos/:id
 */
exports.deleteReviewPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify photo belongs to user's review
    const photo = await prisma.reviewPhoto.findUnique({
      where: { id },
      include: {
        review: true,
      },
    });

    if (!photo || photo.review.userId !== userId) {
      return res.status(404).json({
        error: true,
        message: 'Photo not found or unauthorized',
      });
    }

    await prisma.reviewPhoto.delete({
      where: { id },
    });

    logger.info('Review photo deleted', { id, userId });

    res.json({
      success: true,
      message: 'Photo deleted',
    });
  } catch (error) {
    logger.error('Delete review photo error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete photo',
    });
  }
};

module.exports = exports;
