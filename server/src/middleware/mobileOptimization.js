const logger = require('../lib/logger');

/**
 * Mobile API Optimization Middleware
 * Detects mobile clients and optimizes API responses accordingly
 */

class MobileOptimization {
  /**
   * Detect if request is from a mobile device
   */
  isMobileClient(req) {
    const userAgent = req.get('user-agent') || '';
    const mobileKeywords = [
      'Mobile', 'Android', 'iPhone', 'iPad', 'iPod',
      'BlackBerry', 'Windows Phone', 'webOS', 'Opera Mini'
    ];
    
    // Check User-Agent header
    const isMobileUA = mobileKeywords.some(keyword => 
      userAgent.includes(keyword)
    );
    
    // Check custom header
    const mobileHeader = req.get('X-Mobile-Client');
    
    return isMobileUA || mobileHeader === 'true';
  }

  /**
   * Middleware to detect and flag mobile requests
   */
  detectMobile = (req, res, next) => {
    req.isMobile = this.isMobileClient(req);
    
    // Add response header to indicate mobile optimization
    if (req.isMobile) {
      res.setHeader('X-Mobile-Optimized', 'true');
    }
    
    next();
  };

  /**
   * Optimize images for mobile clients
   */
  optimizeImages(images, isMobile) {
    if (!images || !Array.isArray(images)) return images;
    if (!isMobile) return images;
    
    // Return only first 3 images for mobile
    // In production, you'd resize images server-side
    return images.slice(0, 3).map(image => {
      if (typeof image === 'string') {
        // Add query param for image resizing service
        const separator = image.includes('?') ? '&' : '?';
        return `${image}${separator}w=800&q=75`;
      }
      return image;
    });
  }

  /**
   * Reduce product payload for mobile
   */
  optimizeProduct(product, isMobile, options = {}) {
    if (!product) return product;
    if (!isMobile) return product;

    const { includeReviews = false, includeFullDescription = false } = options;

    const optimized = {
      id: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      condition: product.condition,
      status: product.status,
      images: this.optimizeImages(product.images, true),
      seller: product.seller ? {
        id: product.seller.id,
        username: product.seller.username,
        firstName: product.seller.firstName,
        lastName: product.seller.lastName,
        profilePicture: product.seller.profilePicture,
      } : undefined,
      createdAt: product.createdAt,
    };

    // Include truncated description
    if (product.description) {
      optimized.description = includeFullDescription
        ? product.description
        : this.truncateText(product.description, 200);
    }

    // Include category if present
    if (product.category) {
      optimized.category = product.category;
    }

    // Include location if present
    if (product.location) {
      optimized.location = product.location;
    }

    // Include average rating
    if (product.averageRating !== undefined) {
      optimized.averageRating = product.averageRating;
      optimized.reviewCount = product.reviewCount || 0;
    }

    // Optionally include reviews (limited)
    if (includeReviews && product.reviews && Array.isArray(product.reviews)) {
      optimized.reviews = product.reviews.slice(0, 3).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: this.truncateText(review.comment, 100),
        createdAt: review.createdAt,
        reviewer: review.reviewer ? {
          id: review.reviewer.id,
          username: review.reviewer.username,
        } : undefined,
      }));
    }

    return optimized;
  }

  /**
   * Reduce user payload for mobile
   */
  optimizeUser(user, isMobile) {
    if (!user) return user;
    if (!isMobile) return user;

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      // Exclude: orders, products, reviews, etc.
    };
  }

  /**
   * Reduce order payload for mobile
   */
  optimizeOrder(order, isMobile) {
    if (!order) return order;
    if (!isMobile) return order;

    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      product: order.product ? {
        id: order.product.id,
        title: order.product.title,
        price: order.product.price,
        images: this.optimizeImages(order.product.images, true),
      } : undefined,
      seller: order.seller ? {
        id: order.seller.id,
        username: order.seller.username,
        firstName: order.seller.firstName,
        lastName: order.seller.lastName,
      } : undefined,
      buyer: order.buyer ? {
        id: order.buyer.id,
        username: order.buyer.username,
        firstName: order.buyer.firstName,
        lastName: order.buyer.lastName,
      } : undefined,
      // Exclude: full product details, payment info, refund details
    };
  }

  /**
   * Optimize list response with pagination
   */
  optimizeList(items, isMobile, optimizeFunc, options = {}) {
    if (!items || !Array.isArray(items)) return items;
    if (!isMobile) return items;

    // Reduce page size for mobile
    const mobilePageSize = options.mobilePageSize || 10;
    const limitedItems = items.slice(0, mobilePageSize);

    return limitedItems.map(item => optimizeFunc.call(this, item, true, options));
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Middleware to optimize response for mobile
   * Use this after controller processing, before sending response
   */
  optimizeResponse = (type = 'auto') => {
    return (req, res, next) => {
      if (!req.isMobile) {
        return next();
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method
      res.json = (data) => {
        let optimizedData = data;

        // Auto-detect response type
        if (type === 'auto') {
          if (data.products && Array.isArray(data.products)) {
            optimizedData = {
              ...data,
              products: this.optimizeList(
                data.products,
                true,
                this.optimizeProduct
              ),
            };
          } else if (data.product) {
            optimizedData = {
              ...data,
              product: this.optimizeProduct(data.product, true),
            };
          } else if (data.orders && Array.isArray(data.orders)) {
            optimizedData = {
              ...data,
              orders: this.optimizeList(
                data.orders,
                true,
                this.optimizeOrder
              ),
            };
          } else if (data.order) {
            optimizedData = {
              ...data,
              order: this.optimizeOrder(data.order, true),
            };
          } else if (data.user) {
            optimizedData = {
              ...data,
              user: this.optimizeUser(data.user, true),
            };
          }
        } else if (type === 'product') {
          if (data.products && Array.isArray(data.products)) {
            optimizedData = {
              ...data,
              products: this.optimizeList(
                data.products,
                true,
                this.optimizeProduct
              ),
            };
          } else if (data.product) {
            optimizedData = {
              ...data,
              product: this.optimizeProduct(data.product, true),
            };
          }
        } else if (type === 'order') {
          if (data.orders && Array.isArray(data.orders)) {
            optimizedData = {
              ...data,
              orders: this.optimizeList(
                data.orders,
                true,
                this.optimizeOrder
              ),
            };
          } else if (data.order) {
            optimizedData = {
              ...data,
              order: this.optimizeOrder(data.order, true),
            };
          }
        } else if (type === 'user') {
          if (data.user) {
            optimizedData = {
              ...data,
              user: this.optimizeUser(data.user, true),
            };
          }
        }

        // Add mobile optimization metadata
        if (req.isMobile && optimizedData !== data) {
          optimizedData._meta = {
            ...optimizedData._meta,
            mobileOptimized: true,
            optimizedAt: new Date().toISOString(),
          };

          logger.debug('Mobile response optimized', {
            path: req.path,
            type,
            originalSize: JSON.stringify(data).length,
            optimizedSize: JSON.stringify(optimizedData).length,
          });
        }

        return originalJson(optimizedData);
      };

      next();
    };
  };

  /**
   * Get mobile-specific pagination params
   */
  getMobilePagination(req, defaults = {}) {
    const isMobile = req.isMobile;
    const defaultLimit = defaults.limit || 20;
    const mobileLimit = defaults.mobileLimit || 10;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || (isMobile ? mobileLimit : defaultLimit);

    return {
      page,
      limit: Math.min(limit, 100), // Cap at 100
      offset: (page - 1) * limit,
    };
  }

  /**
   * Check if client supports WebP images
   */
  supportsWebP(req) {
    const accept = req.get('accept') || '';
    return accept.includes('image/webp');
  }

  /**
   * Get optimal image format for client
   */
  getImageFormat(req) {
    if (this.supportsWebP(req)) {
      return 'webp';
    }
    return 'jpeg';
  }
}

module.exports = new MobileOptimization();
