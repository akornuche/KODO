const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const crypto = require('crypto');
const path = require('path');

/**
 * Digital Products Controller
 * Handles digital product downloads and license management
 */

/**
 * Generate download token for digital product
 * POST /api/digital-products/:productId/generate-token
 */
exports.generateDownloadToken = async (req, res) => {
  try {
    const { productId } = req.params;
    const { orderId } = req.body;
    const userId = req.user.id;

    // Verify product is digital
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isDigital) {
      return res.status(404).json({
        error: true,
        message: 'Digital product not found',
      });
    }

    // Verify user purchased this product
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: userId,
        productId: productId,
        status: 'delivered', // Or 'completed'
      },
    });

    if (!order) {
      return res.status(403).json({
        error: true,
        message: 'You have not purchased this product',
      });
    }

    // Check if token already exists
    let download = await prisma.digitalDownload.findFirst({
      where: {
        orderId,
        productId,
        userId,
      },
    });

    if (download) {
      // Check if expired or download limit reached
      if (download.expiresAt && download.expiresAt < new Date()) {
        return res.status(403).json({
          error: true,
          message: 'Download link has expired',
        });
      }

      if (download.maxDownloads && download.downloadCount >= download.maxDownloads) {
        return res.status(403).json({
          error: true,
          message: 'Download limit reached',
        });
      }

      return res.json({
        success: true,
        downloadToken: download.downloadToken,
        downloadUrl: `/api/digital-products/download/${download.downloadToken}`,
        downloadsRemaining: download.maxDownloads 
          ? download.maxDownloads - download.downloadCount 
          : null,
        expiresAt: download.expiresAt,
      });
    }

    // Create new download token
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    download = await prisma.digitalDownload.create({
      data: {
        orderId,
        productId,
        userId,
        downloadToken,
        maxDownloads: product.downloadLimit,
        expiresAt,
      },
    });

    logger.info('Download token generated', { productId, userId, orderId });

    res.json({
      success: true,
      downloadToken: download.downloadToken,
      downloadUrl: `/api/digital-products/download/${download.downloadToken}`,
      downloadsRemaining: download.maxDownloads,
      expiresAt: download.expiresAt,
    });
  } catch (error) {
    logger.error('Generate download token error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to generate download token',
    });
  }
};

/**
 * Download digital product
 * GET /api/digital-products/download/:token
 */
exports.downloadDigitalProduct = async (req, res) => {
  try {
    const { token } = req.params;

    const download = await prisma.digitalDownload.findUnique({
      where: { downloadToken: token },
      include: {
        product: true,
      },
    });

    if (!download) {
      return res.status(404).json({
        error: true,
        message: 'Invalid download link',
      });
    }

    // Check expiry
    if (download.expiresAt && download.expiresAt < new Date()) {
      return res.status(403).json({
        error: true,
        message: 'Download link has expired',
      });
    }

    // Check download limit
    if (download.maxDownloads && download.downloadCount >= download.maxDownloads) {
      return res.status(403).json({
        error: true,
        message: 'Download limit reached',
      });
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: download.productId },
    });

    if (!product || !product.digitalFileUrl) {
      return res.status(404).json({
        error: true,
        message: 'Digital file not found',
      });
    }

    // Update download count
    await prisma.digitalDownload.update({
      where: { id: download.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info('Digital product downloaded', { 
      productId: product.id, 
      userId: download.userId,
      downloadCount: download.downloadCount + 1,
    });

    // Send file (in production, this would be a pre-signed S3/Cloudinary URL)
    res.json({
      success: true,
      downloadUrl: product.digitalFileUrl,
      filename: product.digitalFileName || `${product.title}.zip`,
      fileSize: product.digitalFileSize,
    });
  } catch (error) {
    logger.error('Download digital product error:', { error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to download product',
    });
  }
};

/**
 * Get user's digital products
 * GET /api/digital-products/my-products
 */
exports.getUserDigitalProducts = async (req, res) => {
  try {
    const userId = req.user.id;

    const downloads = await prisma.digitalDownload.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            digitalFileName: true,
            digitalFileSize: true,
            licenseType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      downloads: downloads.map(d => ({
        ...d,
        downloadsRemaining: d.maxDownloads 
          ? d.maxDownloads - d.downloadCount 
          : null,
        isExpired: d.expiresAt && d.expiresAt < new Date(),
      })),
    });
  } catch (error) {
    logger.error('Get user digital products error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve digital products',
    });
  }
};

/**
 * Get download statistics (seller)
 * GET /api/digital-products/stats
 */
exports.getDownloadStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get seller's digital products
    const products = await prisma.product.findMany({
      where: {
        sellerId: userId,
        isDigital: true,
      },
      select: { id: true },
    });

    const productIds = products.map(p => p.id);

    if (productIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalDownloads: 0,
          totalProducts: 0,
          downloadsByProduct: [],
        },
      });
    }

    // Get download stats
    const downloads = await prisma.digitalDownload.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
      },
      _sum: {
        downloadCount: true,
      },
      _count: {
        id: true,
      },
    });

    const totalDownloads = downloads.reduce((sum, d) => sum + (d._sum.downloadCount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalDownloads,
        totalProducts: productIds.length,
        totalCustomers: downloads.reduce((sum, d) => sum + (d._count.id || 0), 0),
        downloadsByProduct: downloads,
      },
    });
  } catch (error) {
    logger.error('Get download stats error:', { error: error.message, userId: req.user.id });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve download statistics',
    });
  }
};

module.exports = exports;
