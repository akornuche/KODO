const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Size Guide Controller
 * Handles measurement charts for products
 */

/**
 * Create size guide
 * POST /api/size-guides
 */
exports.createSizeGuide = async (req, res) => {
  try {
    const { productId, category, region, measurements, imageUrl, notes } = req.body;
    const userId = req.user.id;

    // Verify product belongs to seller
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found or unauthorized',
      });
    }

    const sizeGuide = await prisma.sizeGuide.create({
      data: {
        productId,
        category,
        region: region || 'US',
        measurements,
        imageUrl,
        notes,
      },
    });

    logger.info('Size guide created', { productId, userId });

    res.json({
      success: true,
      sizeGuide,
    });
  } catch (error) {
    logger.error('Create size guide error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create size guide',
    });
  }
};

/**
 * Get size guides for product
 * GET /api/size-guides/product/:productId
 */
exports.getProductSizeGuides = async (req, res) => {
  try {
    const { productId } = req.params;

    const sizeGuides = await prisma.sizeGuide.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      sizeGuides,
    });
  } catch (error) {
    logger.error('Get size guides error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve size guides',
    });
  }
};

/**
 * Update size guide
 * PUT /api/size-guides/:id
 */
exports.updateSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Verify ownership
    const sizeGuide = await prisma.sizeGuide.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!sizeGuide || sizeGuide.product.sellerId !== userId) {
      return res.status(404).json({
        error: true,
        message: 'Size guide not found or unauthorized',
      });
    }

    const updated = await prisma.sizeGuide.update({
      where: { id },
      data: updateData,
    });

    logger.info('Size guide updated', { id, userId });

    res.json({
      success: true,
      sizeGuide: updated,
    });
  } catch (error) {
    logger.error('Update size guide error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update size guide',
    });
  }
};

/**
 * Delete size guide
 * DELETE /api/size-guides/:id
 */
exports.deleteSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const sizeGuide = await prisma.sizeGuide.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!sizeGuide || sizeGuide.product.sellerId !== userId) {
      return res.status(404).json({
        error: true,
        message: 'Size guide not found or unauthorized',
      });
    }

    await prisma.sizeGuide.delete({
      where: { id },
    });

    logger.info('Size guide deleted', { id, userId });

    res.json({
      success: true,
      message: 'Size guide deleted',
    });
  } catch (error) {
    logger.error('Delete size guide error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete size guide',
    });
  }
};

module.exports = exports;
