const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { generateSKU } = require('../lib/utils');

/**
 * Product Variant Controller
 * Handles product variants and inventory management
 */

/**
 * Get variants for a product
 * GET /api/products/:productId/variants
 */
exports.getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      variants,
    });
  } catch (error) {
    logger.error('Get product variants error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve variants',
    });
  }
};

/**
 * Create variant for product
 * POST /api/products/:productId/variants
 */
exports.createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const {
      name,
      size,
      color,
      colorHex,
      material,
      price,
      stockQuantity = 0,
      lowStockThreshold = 5,
      weight,
      dimensions,
      imageUrl,
      order = 0,
    } = req.body;

    // Check if product exists and user is the seller
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

    // Generate SKU
    const sku = generateSKU(product.category, productId);

    // Create variant
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        name,
        size,
        color,
        colorHex,
        material,
        price,
        stockQuantity,
        lowStockThreshold,
        weight,
        dimensions,
        imageUrl,
        order,
      },
    });

    logger.info('Product variant created', { productId, variantId: variant.id, userId });

    res.json({
      success: true,
      message: 'Variant created successfully',
      variant,
    });
  } catch (error) {
    logger.error('Create variant error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to create variant',
    });
  }
};

/**
 * Update variant
 * PUT /api/products/:productId/variants/:variantId
 */
exports.updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if product exists and user is the seller
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

    // Update variant
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    logger.info('Product variant updated', { productId, variantId, userId });

    res.json({
      success: true,
      message: 'Variant updated successfully',
      variant,
    });
  } catch (error) {
    logger.error('Update variant error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update variant',
    });
  }
};

/**
 * Delete variant
 * DELETE /api/products/:productId/variants/:variantId
 */
exports.deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const userId = req.user.id;

    // Check if product exists and user is the seller
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

    // Delete variant
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    logger.info('Product variant deleted', { productId, variantId, userId });

    res.json({
      success: true,
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    logger.error('Delete variant error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to delete variant',
    });
  }
};

/**
 * Update stock quantity
 * PUT /api/products/:productId/variants/:variantId/stock
 */
exports.updateStock = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const userId = req.user.id;
    const { stockQuantity } = req.body;

    if (stockQuantity === undefined || stockQuantity < 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid stock quantity',
      });
    }

    // Check if product exists and user is the seller
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

    // Update stock
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity },
    });

    // Check if low stock
    const lowStock = variant.stockQuantity <= variant.lowStockThreshold;

    logger.info('Stock updated', {
      productId,
      variantId,
      stockQuantity,
      lowStock,
      userId,
    });

    // TODO: Send low stock notification if needed

    res.json({
      success: true,
      message: 'Stock updated successfully',
      variant,
      lowStock,
    });
  } catch (error) {
    logger.error('Update stock error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to update stock',
    });
  }
};

/**
 * Get low stock variants (seller only)
 * GET /api/variants/low-stock
 */
exports.getLowStockVariants = async (req, res) => {
  try {
    const userId = req.user.id;

    const variants = await prisma.productVariant.findMany({
      where: {
        product: {
          sellerId: userId,
        },
        stockQuantity: {
          lte: prisma.raw('lowStockThreshold'),
        },
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    res.json({
      success: true,
      variants,
      count: variants.length,
    });
  } catch (error) {
    logger.error('Get low stock variants error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve low stock variants',
    });
  }
};

/**
 * Bulk update stock (seller only)
 * POST /api/variants/bulk-update-stock
 */
exports.bulkUpdateStock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { updates } = req.body; // Array of { variantId, stockQuantity }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid updates array',
      });
    }

    // Verify all variants belong to seller
    const variantIds = updates.map(u => u.variantId);
    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        product: {
          sellerId: userId,
        },
      },
    });

    if (variants.length !== variantIds.length) {
      return res.status(403).json({
        error: true,
        message: 'Some variants do not belong to you',
      });
    }

    // Perform bulk update
    const updatePromises = updates.map(({ variantId, stockQuantity }) =>
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity },
      })
    );

    await Promise.all(updatePromises);

    logger.info('Bulk stock update', { userId, count: updates.length });

    res.json({
      success: true,
      message: `${updates.length} variants updated successfully`,
    });
  } catch (error) {
    logger.error('Bulk update stock error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to bulk update stock',
    });
  }
};

module.exports = exports;
