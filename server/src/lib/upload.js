const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const imageOptimizer = require('./imageOptimizer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage for multer (files stored in memory before processing)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10, // Maximum 10 files per upload
  },
});

// Process and upload image to Cloudinary
const processAndUploadImage = async (buffer, filename, options = {}) => {
  const {
    folder = 'kodo/products',
    public_id,
    generateThumbnails = true,
    responsiveImages = false,
    ...otherOptions
  } = options;

  try {
    // Validate image first
    const validation = await imageOptimizer.validateImage(buffer);
    if (!validation.isValid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    // Process image with comprehensive optimization
    const processedImage = await imageOptimizer.processImage(buffer, filename, {
      maxWidth: otherOptions.width || 1920,
      maxHeight: otherOptions.height || 1080,
      quality: otherOptions.quality || 85,
      format: otherOptions.format || 'webp',
      generateThumbnails,
      preserveMetadata: false
    });

    // Upload main image to Cloudinary
    const uploadOptions = {
      folder,
      public_id: public_id || uuidv4(),
      resource_type: 'image',
    };

    const result = await cloudinary.uploader.upload(
      `data:image/${processedImage.metadata.format};base64,${processedImage.buffer.toString('base64')}`,
      uploadOptions
    );

    const imageData = {
      public_id: result.public_id,
      url: result.secure_url,
      thumbnailUrl: result.secure_url, // Will be updated if thumbnails generated
      width: processedImage.metadata.width,
      height: processedImage.metadata.height,
      format: processedImage.metadata.format,
      size: processedImage.optimizedSize,
      originalSize: processedImage.originalSize,
      compressionRatio: processedImage.compressionRatio
    };

    // Generate and upload thumbnails
    if (generateThumbnails && processedImage.thumbnails) {
      const thumbnailUploads = [];

      for (const [size, thumbnail] of Object.entries(processedImage.thumbnails)) {
        const thumbUpload = cloudinary.uploader.upload(
          `data:image/webp;base64,${thumbnail.buffer.toString('base64')}`,
          {
            folder: `${folder}/thumbnails`,
            public_id: `${result.public_id}_thumb_${size}`,
            resource_type: 'image',
          }
        );
        thumbnailUploads.push(thumbUpload);
      }

      const thumbnailResults = await Promise.all(thumbnailUploads);

      // Add thumbnail URLs to image data
      imageData.thumbnails = {};
      thumbnailResults.forEach((thumbResult, index) => {
        const size = Object.keys(processedImage.thumbnails)[index];
        imageData.thumbnails[size] = {
          url: thumbResult.secure_url,
          width: processedImage.thumbnails[size].metadata.width,
          height: processedImage.thumbnails[size].metadata.height,
          size: processedImage.thumbnails[size].size
        };
      });

      // Set medium thumbnail as default thumbnail URL
      if (imageData.thumbnails.medium) {
        imageData.thumbnailUrl = imageData.thumbnails.medium.url;
      }
    }

    // Generate responsive images if requested
    if (responsiveImages) {
      const responsiveResults = await imageOptimizer.generateResponsiveImages(buffer, filename);
      imageData.responsive = {};

      for (const [format, responsiveImage] of Object.entries(responsiveResults)) {
        const responsiveUpload = await cloudinary.uploader.upload(
          `data:image/${format};base64,${responsiveImage.buffer.toString('base64')}`,
          {
            folder: `${folder}/responsive`,
            public_id: `${result.public_id}_responsive_${format}`,
            resource_type: 'image',
          }
        );

        imageData.responsive[format] = {
          url: responsiveUpload.secure_url,
          size: responsiveImage.size
        };
      }
    }

    // Extract dominant colors
    const dominantColors = await imageOptimizer.extractDominantColors(buffer);
    if (dominantColors.length > 0) {
      imageData.dominantColor = dominantColors[0].hex;
    }

    // Create blur placeholder
    const blurPlaceholder = await imageOptimizer.createBlurPlaceholder(buffer);
    if (blurPlaceholder) {
      imageData.blurPlaceholder = blurPlaceholder;
    }

    logger.info('Image processed and uploaded to Cloudinary', {
      public_id: result.public_id,
      url: result.secure_url,
      optimizedSize: processedImage.optimizedSize,
      compressionRatio: processedImage.compressionRatio + '%',
      thumbnailsGenerated: generateThumbnails && processedImage.thumbnails ? Object.keys(processedImage.thumbnails).length : 0,
      responsiveGenerated: responsiveImages ? Object.keys(imageData.responsive || {}).length : 0
    });

    return imageData;
  } catch (error) {
    logger.error('Image processing/upload error:', { error: error.message });
    throw new Error('Failed to process and upload image');
  }
};

// Upload multiple images
const processAndUploadImages = async (files, options = {}) => {
  const results = [];

  for (const file of files) {
    try {
      const result = await processAndUploadImage(file.buffer, file.originalname, {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${results.length}` : undefined,
      });
      results.push(result);
    } catch (error) {
      logger.error(`Failed to upload image ${file.originalname}:`, { error: error.message });
      // Continue with other images, but log the error
      results.push({
        error: `Failed to upload ${file.originalname}: ${error.message}`,
        originalname: file.originalname,
      });
    }
  }

  return results;
};

// Delete image from Cloudinary
const deleteImage = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    logger.info('Image deleted from Cloudinary', { public_id, result });
    return result;
  } catch (error) {
    logger.error('Image deletion error:', { error: error.message, public_id });
    throw new Error('Failed to delete image');
  }
};

// Delete multiple images
const deleteImages = async (public_ids) => {
  const results = [];

  for (const public_id of public_ids) {
    try {
      const result = await deleteImage(public_id);
      results.push({ public_id, result });
    } catch (error) {
      logger.error(`Failed to delete image ${public_id}:`, { error: error.message });
      results.push({ public_id, error: error.message });
    }
  }

  return results;
};

// Generate optimized image URLs with transformations
const getOptimizedImageUrl = (public_id, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    crop = 'fill',
  } = options;

  return cloudinary.url(public_id, {
    width,
    height,
    quality,
    format,
    crop,
    secure: true,
  });
};

// Legacy functions for backward compatibility (return mock responses)
const processImage = async (filePath, options = {}) => {
  logger.warn('processImage is deprecated, use processAndUploadImage instead');
  return { url: 'deprecated', thumbnail_url: 'deprecated' };
};

const generateThumbnail = async (filePath, size = 200) => {
  logger.warn('generateThumbnail is deprecated, use getOptimizedImageUrl instead');
  return 'deprecated';
};

const getFilePathFromUrl = (url) => {
  logger.warn('getFilePathFromUrl is deprecated for Cloudinary implementation');
  return null;
};

const getPublicUrl = (filePath, req) => {
  logger.warn('getPublicUrl is deprecated for Cloudinary implementation');
  return null;
};

module.exports = {
  upload,
  processAndUploadImage,
  processAndUploadImages,
  deleteImage,
  deleteImages,
  getOptimizedImageUrl,
  // Legacy exports for backward compatibility
  processImage,
  generateThumbnail,
  getFilePathFromUrl,
  getPublicUrl,
};
