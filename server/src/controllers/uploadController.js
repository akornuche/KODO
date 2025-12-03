const { processAndUploadImages, deleteImages, getOptimizedImageUrl } = require('../lib/upload');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload product images
 * POST /api/upload/products/:productId/images
 */
const uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;
    const { alt, caption } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No files uploaded',
        code: 'NO_FILES_UPLOADED',
        requestId: req.id,
      });
    }

    // Validate product ownership (user must be the seller)
    const { prisma } = req;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true, title: true },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (product.sellerId !== req.user.id) {
      return res.status(403).json({
        error: true,
        message: 'You can only upload images for your own products',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Process and upload images
    const uploadResults = await processAndUploadImages(req.files, {
      folder: `kodo/products/${productId}`,
      public_id: `${productId}_${Date.now()}`,
    });

    // Filter out failed uploads
    const successfulUploads = uploadResults.filter(result => !result.error);
    const failedUploads = uploadResults.filter(result => result.error);

    if (successfulUploads.length === 0) {
      return res.status(500).json({
        error: true,
        message: 'All image uploads failed',
        code: 'UPLOAD_FAILED',
        requestId: req.id,
        details: failedUploads,
      });
    }

    // Create image records in database
    const imageRecords = successfulUploads.map((upload, index) => ({
      id: uuidv4(),
      productId,
      url: upload.url,
      thumbnailUrl: upload.thumbnail_url,
      publicId: upload.public_id,
      alt: alt || `${product.title} - Image ${index + 1}`,
      caption: caption || null,
      width: upload.width,
      height: upload.height,
      size: upload.bytes,
      format: upload.format,
      order: index,
    }));

    const createdImages = await prisma.productImage.createMany({
      data: imageRecords,
    });

    logger.info('Product images uploaded successfully', {
      productId,
      uploadedCount: successfulUploads.length,
      failedCount: failedUploads.length,
      requestId: req.id,
    });

    res.status(201).json({
      message: 'Product images uploaded successfully',
      data: {
        images: imageRecords,
        uploaded: successfulUploads.length,
        failed: failedUploads.length,
        failures: failedUploads.length > 0 ? failedUploads : undefined,
      },
      requestId: req.id,
    });

  } catch (error) {
    logger.error('Product image upload failed:', {
      error: error.message,
      productId: req.params.productId,
      requestId: req.id,
    });

    res.status(500).json({
      error: true,
      message: 'Failed to upload product images',
      code: 'UPLOAD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete product image
 * DELETE /api/upload/products/:productId/images/:imageId
 */
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    const { prisma } = req;

    // Find the image and verify ownership
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
        product: {
          sellerId: req.user.id,
        },
      },
      select: {
        publicId: true,
        url: true,
      },
    });

    if (!image) {
      return res.status(404).json({
        error: true,
        message: 'Image not found or access denied',
        code: 'IMAGE_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Delete from Cloudinary
    await deleteImages([image.publicId]);

    // Delete from database
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    logger.info('Product image deleted successfully', {
      productId,
      imageId,
      publicId: image.publicId,
      requestId: req.id,
    });

    res.json({
      message: 'Product image deleted successfully',
      requestId: req.id,
    });

  } catch (error) {
    logger.error('Product image deletion failed:', {
      error: error.message,
      productId: req.params.productId,
      imageId: req.params.imageId,
      requestId: req.id,
    });

    res.status(500).json({
      error: true,
      message: 'Failed to delete product image',
      code: 'DELETE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Upload user avatar
 * POST /api/upload/avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No file uploaded',
        code: 'NO_FILE_UPLOADED',
        requestId: req.id,
      });
    }

    const { prisma } = req;
    const userId = req.user.id;

    // Process and upload avatar
    const uploadResults = await processAndUploadImages([req.file], {
      folder: `kodo/avatars/${userId}`,
      public_id: `avatar_${userId}_${Date.now()}`,
      width: 300,
      height: 300,
      crop: 'fill',
    });

    const upload = uploadResults[0];

    if (upload.error) {
      return res.status(500).json({
        error: true,
        message: 'Avatar upload failed',
        code: 'UPLOAD_FAILED',
        requestId: req.id,
        details: upload.error,
      });
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true },
    });

    // Delete old avatar if exists
    if (currentUser.avatarPublicId) {
      try {
        await deleteImages([currentUser.avatarPublicId]);
      } catch (deleteError) {
        logger.warn('Failed to delete old avatar:', {
          error: deleteError.message,
          publicId: currentUser.avatarPublicId,
        });
        // Continue with upload even if old avatar deletion fails
      }
    }

    // Update user with new avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: upload.url,
        avatarPublicId: upload.public_id,
      },
      select: {
        id: true,
        avatarUrl: true,
        avatarPublicId: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    });

    logger.info('User avatar uploaded successfully', {
      userId,
      publicId: upload.public_id,
      requestId: req.id,
    });

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        avatar: {
          url: upload.url,
          thumbnail_url: upload.thumbnail_url,
          public_id: upload.public_id,
        },
      },
      requestId: req.id,
    });

  } catch (error) {
    logger.error('Avatar upload failed:', {
      error: error.message,
      userId: req.user.id,
      requestId: req.id,
    });

    res.status(500).json({
      error: true,
      message: 'Failed to upload avatar',
      code: 'UPLOAD_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Delete user avatar
 * DELETE /api/upload/avatar
 */
const deleteAvatar = async (req, res) => {
  try {
    const { prisma } = req;
    const userId = req.user.id;

    // Get current user avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarPublicId: true, avatarUrl: true },
    });

    if (!currentUser.avatarPublicId) {
      return res.status(404).json({
        error: true,
        message: 'No avatar found to delete',
        code: 'AVATAR_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Delete from Cloudinary
    await deleteImages([currentUser.avatarPublicId]);

    // Update user to remove avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
        avatarPublicId: null,
      },
      select: {
        id: true,
        avatarUrl: true,
        avatarPublicId: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    });

    logger.info('User avatar deleted successfully', {
      userId,
      publicId: currentUser.avatarPublicId,
      requestId: req.id,
    });

    res.json({
      message: 'Avatar deleted successfully',
      data: { user: updatedUser },
      requestId: req.id,
    });

  } catch (error) {
    logger.error('Avatar deletion failed:', {
      error: error.message,
      userId: req.user.id,
      requestId: req.id,
    });

    res.status(500).json({
      error: true,
      message: 'Failed to delete avatar',
      code: 'DELETE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get optimized image URL
 * GET /api/upload/optimize/:publicId
 */
const getOptimizedImage = async (req, res) => {
  try {
    const { publicId } = req.params;
    const { width, height, quality, format, crop } = req.query;

    const options = {};
    if (width) options.width = parseInt(width);
    if (height) options.height = parseInt(height);
    if (quality) options.quality = parseInt(quality);
    if (format) options.format = format;
    if (crop) options.crop = crop;

    const optimizedUrl = getOptimizedImageUrl(publicId, options);

    res.json({
      url: optimizedUrl,
      publicId,
      options,
      requestId: req.id,
    });

  } catch (error) {
    logger.error('Failed to generate optimized image URL:', {
      error: error.message,
      publicId: req.params.publicId,
      requestId: req.id,
    });

    res.status(500).json({
      error: true,
      message: 'Failed to generate optimized image URL',
      code: 'OPTIMIZE_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = {
  uploadProductImages,
  deleteProductImage,
  uploadAvatar,
  deleteAvatar,
  getOptimizedImage,
};