const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * Image optimization and processing utility using Sharp
 * Provides compression, resizing, format conversion, and thumbnail generation
 */
class ImageOptimizer {
  constructor() {
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.thumbnailSizes = {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 600, height: 600 }
    };
  }

  /**
   * Process and optimize an uploaded image
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  async processImage(buffer, filename, options = {}) {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format = 'webp',
        generateThumbnails = true,
        preserveMetadata = false
      } = options;

      // Validate input
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid image buffer');
      }

      if (buffer.length > this.maxFileSize) {
        throw new Error(`Image file size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
      }

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      logger.debug(`Processing image: ${filename}`, {
        originalSize: buffer.length,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
      });

      // Determine output format
      const outputFormat = this.supportedFormats.includes(format.toLowerCase()) ? format.toLowerCase() : 'webp';

      // Calculate resize dimensions
      const { width, height } = this.calculateResizeDimensions(metadata.width, metadata.height, maxWidth, maxHeight);

      // Process main image
      let sharpInstance = sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });

      // Apply format-specific options
      if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: true,
          mozjpeg: true
        });
      } else if (outputFormat === 'png') {
        sharpInstance = sharpInstance.png({
          quality,
          progressive: true,
          compressionLevel: 6
        });
      } else if (outputFormat === 'webp') {
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 4
        });
      } else if (outputFormat === 'avif') {
        sharpInstance = sharpInstance.avif({
          quality,
          effort: 4
        });
      }

      // Remove metadata if not preserving
      if (!preserveMetadata) {
        sharpInstance = sharpInstance.removeMetadata();
      }

      // Generate optimized image
      const optimizedBuffer = await sharpInstance.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      const result = {
        buffer: optimizedBuffer,
        metadata: optimizedMetadata,
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ((buffer.length - optimizedBuffer.length) / buffer.length * 100).toFixed(2),
        filename: this.generateOptimizedFilename(filename, outputFormat)
      };

      // Generate thumbnails if requested
      if (generateThumbnails) {
        result.thumbnails = await this.generateThumbnails(buffer, filename);
      }

      logger.info(`Image processed successfully: ${filename}`, {
        originalSize: result.originalSize,
        optimizedSize: result.optimizedSize,
        compressionRatio: result.compressionRatio + '%',
        thumbnailsGenerated: generateThumbnails ? Object.keys(this.thumbnailSizes).length : 0
      });

      return result;
    } catch (error) {
      logger.error(`Image processing error for ${filename}:`, error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Generate thumbnails for an image
   * @param {Buffer} buffer - Original image buffer
   * @param {string} filename - Original filename
   * @returns {Object} Thumbnail results
   */
  async generateThumbnails(buffer, filename) {
    const thumbnails = {};

    try {
      for (const [size, dimensions] of Object.entries(this.thumbnailSizes)) {
        const thumbnailBuffer = await sharp(buffer)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({
            quality: 80,
            effort: 4
          })
          .removeMetadata()
          .toBuffer();

        const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

        thumbnails[size] = {
          buffer: thumbnailBuffer,
          metadata: thumbnailMetadata,
          size: thumbnailBuffer.length,
          filename: this.generateThumbnailFilename(filename, size)
        };
      }

      return thumbnails;
    } catch (error) {
      logger.error(`Thumbnail generation error for ${filename}:`, error);
      throw new Error(`Failed to generate thumbnails: ${error.message}`);
    }
  }

  /**
   * Calculate optimal resize dimensions
   * @param {number} originalWidth
   * @param {number} originalHeight
   * @param {number} maxWidth
   * @param {number} maxHeight
   * @returns {Object} Calculated dimensions
   */
  calculateResizeDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    // If image is already within limits, don't resize
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scaleFactor = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * scaleFactor),
      height: Math.round(originalHeight * scaleFactor)
    };
  }

  /**
   * Generate optimized filename
   * @param {string} originalFilename
   * @param {string} format
   * @returns {string} Optimized filename
   */
  generateOptimizedFilename(originalFilename, format) {
    const parsed = path.parse(originalFilename);
    return `${parsed.name}_optimized.${format}`;
  }

  /**
   * Generate thumbnail filename
   * @param {string} originalFilename
   * @param {string} size
   * @returns {string} Thumbnail filename
   */
  generateThumbnailFilename(originalFilename, size) {
    const parsed = path.parse(originalFilename);
    return `${parsed.name}_thumb_${size}.webp`;
  }

  /**
   * Validate image format and basic properties
   * @param {Buffer} buffer - Image buffer
   * @returns {Object} Validation result
   */
  async validateImage(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();

      const validation = {
        isValid: true,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        errors: []
      };

      // Check file size
      if (buffer.length > this.maxFileSize) {
        validation.isValid = false;
        validation.errors.push(`File size ${buffer.length} exceeds maximum ${this.maxFileSize}`);
      }

      // Check format
      if (!this.supportedFormats.includes(metadata.format)) {
        validation.isValid = false;
        validation.errors.push(`Unsupported format: ${metadata.format}`);
      }

      // Check dimensions (reasonable limits)
      if (metadata.width > 10000 || metadata.height > 10000) {
        validation.isValid = false;
        validation.errors.push('Image dimensions too large');
      }

      if (metadata.width < 10 || metadata.height < 10) {
        validation.isValid = false;
        validation.errors.push('Image dimensions too small');
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Invalid image file: ${error.message}`]
      };
    }
  }

  /**
   * Convert image to multiple formats for responsive images
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @returns {Object} Multiple format results
   */
  async generateResponsiveImages(buffer, filename) {
    const formats = ['webp', 'avif', 'jpeg'];
    const results = {};

    try {
      for (const format of formats) {
        const processed = await this.processImage(buffer, filename, {
          format,
          generateThumbnails: false
        });

        results[format] = {
          buffer: processed.buffer,
          size: processed.optimizedSize,
          filename: this.generateOptimizedFilename(filename, format)
        };
      }

      return results;
    } catch (error) {
      logger.error(`Responsive image generation error for ${filename}:`, error);
      throw new Error(`Failed to generate responsive images: ${error.message}`);
    }
  }

  /**
   * Extract dominant colors from image
   * @param {Buffer} buffer - Image buffer
   * @param {number} count - Number of colors to extract
   * @returns {Array} Array of color objects
   */
  async extractDominantColors(buffer, count = 5) {
    try {
      const { dominant } = await sharp(buffer)
        .stats();

      // Sharp's dominant color extraction is basic, return what we can
      if (dominant) {
        return [{
          r: dominant.r,
          g: dominant.g,
          b: dominant.b,
          hex: `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`
        }];
      }

      return [];
    } catch (error) {
      logger.error('Color extraction error:', error);
      return [];
    }
  }

  /**
   * Create a blur placeholder (data URL)
   * @param {Buffer} buffer - Image buffer
   * @param {number} width - Blur placeholder width
   * @param {number} height - Blur placeholder height
   * @returns {string} Base64 data URL
   */
  async createBlurPlaceholder(buffer, width = 20, height = 20) {
    try {
      const blurBuffer = await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .blur(10)
        .jpeg({
          quality: 30,
          progressive: false
        })
        .toBuffer();

      const base64 = blurBuffer.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      logger.error('Blur placeholder creation error:', error);
      return null;
    }
  }

  /**
   * Batch process multiple images
   * @param {Array} images - Array of image objects {buffer, filename, options}
   * @returns {Array} Array of processing results
   */
  async batchProcess(images) {
    const results = [];

    for (const image of images) {
      try {
        const result = await this.processImage(
          image.buffer,
          image.filename,
          image.options || {}
        );
        results.push({
          success: true,
          filename: image.filename,
          result
        });
      } catch (error) {
        results.push({
          success: false,
          filename: image.filename,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get image optimization statistics
   * @param {Array} results - Array of processing results
   * @returns {Object} Statistics
   */
  getOptimizationStats(results) {
    const stats = {
      totalImages: results.length,
      successful: 0,
      failed: 0,
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      averageCompressionRatio: 0
    };

    results.forEach(result => {
      if (result.success) {
        stats.successful++;
        stats.totalOriginalSize += result.result.originalSize;
        stats.totalOptimizedSize += result.result.optimizedSize;
      } else {
        stats.failed++;
      }
    });

    if (stats.successful > 0) {
      const totalSaved = stats.totalOriginalSize - stats.totalOptimizedSize;
      stats.averageCompressionRatio = ((totalSaved / stats.totalOriginalSize) * 100).toFixed(2);
      stats.totalSpaceSaved = totalSaved;
    }

    return stats;
  }
}

module.exports = new ImageOptimizer();