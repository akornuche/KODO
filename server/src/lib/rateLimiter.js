const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('./logger');

// Rate limiting configuration
class RateLimiter {
  constructor() {
    this.redisClient = null;
    this.useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize Redis store for rate limiting (if available)
   */
  initializeRedis(redisClient) {
    this.redisClient = redisClient;
    this.useRedis = true;
  }

  /**
   * Create rate limiter middleware
   * @param {Object} options - Rate limiting options
   */
  createLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // Limit each IP to 100 requests per windowMs
      message = {
        error: true,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      },
      standardHeaders = true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders = false, // Disable the `X-RateLimit-*` headers
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator,
      handler = this.defaultHandler,
      store = this.useRedis && this.redisClient ?
        new RedisStore({ client: this.redisClient }) :
        undefined,
    } = options;

    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler,
      store,
    });
  }

  /**
   * Default key generator - uses IP address
   */
  defaultKeyGenerator(req) {
    // Use the express-rate-limit helper for proper IPv6 handling
    return ipKeyGenerator(req);
  }

  /**
   * Default rate limit handler
   */
  defaultHandler(req, res, next, options) {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.headers['user-agent'],
      limit: options.max,
      windowMs: options.windowMs,
    });

    res.status(429).json(options.message);
  }

  /**
   * Create user-based rate limiter (requires authentication)
   */
  createUserLimiter(options = {}) {
    return this.createLimiter({
      ...options,
      keyGenerator: (req) => {
        // Use user ID for authenticated requests
        return req.user?.id || this.defaultKeyGenerator(req);
      },
    });
  }

  /**
   * General API rate limiter - applies to most endpoints
   */
  get generalLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: {
        error: true,
        message: 'Too many requests. Please try again in 15 minutes.',
        code: 'GENERAL_RATE_LIMIT',
        retryAfter: 900,
      },
    });
  }

  /**
   * Strict API rate limiter - for sensitive operations
   */
  get strictLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 requests per minute
      message: {
        error: true,
        message: 'Too many sensitive operations. Please try again in 1 minute.',
        code: 'STRICT_RATE_LIMIT',
        retryAfter: 60,
      },
    });
  }

  /**
   * Authentication rate limiter - for login/register endpoints
   */
  get authLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      message: {
        error: true,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'AUTH_RATE_LIMIT',
        retryAfter: 900,
      },
      skipSuccessfulRequests: true, // Don't count successful logins
    });
  }

  /**
   * Search rate limiter - for search endpoints
   */
  get searchLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: {
        error: true,
        message: 'Too many search requests. Please try again in 1 minute.',
        code: 'SEARCH_RATE_LIMIT',
        retryAfter: 60,
      },
    });
  }

  /**
   * File upload rate limiter
   */
  get uploadLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 uploads per hour
      message: {
        error: true,
        message: 'Too many file uploads. Please try again in 1 hour.',
        code: 'UPLOAD_RATE_LIMIT',
        retryAfter: 3600,
      },
    });
  }

  /**
   * Notification rate limiter
   */
  get notificationLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 20, // 20 notifications per minute
      message: {
        error: true,
        message: 'Too many notification requests. Please try again in 1 minute.',
        code: 'NOTIFICATION_RATE_LIMIT',
        retryAfter: 60,
      },
    });
  }

  /**
   * Admin rate limiter - more permissive for admin users
   */
  get adminLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute for admins
      keyGenerator: (req) => {
        // Use user ID for admins, IP for others
        return req.user?.role === 'admin' ? `admin_${req.user.id}` : this.defaultKeyGenerator(req);
      },
    });
  }

  /**
   * Create custom rate limiter for specific use cases
   * @param {Object} config - Custom configuration
   */
  createCustomLimiter(config) {
    return this.createLimiter({
      windowMs: config.windowMs || 15 * 60 * 1000,
      max: config.max || 100,
      message: {
        error: true,
        message: config.message || 'Rate limit exceeded',
        code: config.code || 'CUSTOM_RATE_LIMIT',
        retryAfter: Math.ceil((config.windowMs || 15 * 60 * 1000) / 1000),
      },
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
    });
  }

  /**
   * Create burst rate limiter for high-frequency operations
   * @param {number} burstLimit - Maximum requests in burst window
   * @param {number} burstWindowMs - Burst window in milliseconds
   * @param {number} sustainedLimit - Sustained limit
   * @param {number} sustainedWindowMs - Sustained window in milliseconds
   */
  createBurstLimiter(burstLimit = 10, burstWindowMs = 1000, sustainedLimit = 100, sustainedWindowMs = 60000) {
    return [
      // Burst limiter (short window, high limit)
      this.createLimiter({
        windowMs: burstWindowMs,
        max: burstLimit,
        message: {
          error: true,
          message: `Too many requests. Burst limit exceeded.`,
          code: 'BURST_RATE_LIMIT',
          retryAfter: Math.ceil(burstWindowMs / 1000),
        },
      }),
      // Sustained limiter (longer window, lower limit)
      this.createLimiter({
        windowMs: sustainedWindowMs,
        max: sustainedLimit,
        message: {
          error: true,
          message: `Too many requests. Sustained limit exceeded.`,
          code: 'SUSTAINED_RATE_LIMIT',
          retryAfter: Math.ceil(sustainedWindowMs / 1000),
        },
      }),
    ];
  }

  /**
   * Get rate limit status for monitoring
   * @param {string} key - Rate limit key
   */
  async getRateLimitStatus(key) {
    if (!this.useRedis || !this.redisClient) {
      return { available: false, message: 'Redis not available for rate limit monitoring' };
    }

    try {
      // This would require accessing Redis directly to get rate limit data
      // Implementation depends on the Redis store structure
      return { available: true, data: {} };
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - Rate limit key to reset
   */
  async resetRateLimit(key) {
    if (!this.useRedis || !this.redisClient) {
      return { success: false, message: 'Redis not available for rate limit reset' };
    }

    try {
      // Reset rate limit in Redis
      const pattern = `rl:${key}:*`;
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(keys);
        logger.info('Rate limit reset', { key, deletedKeys: keys.length });
        return { success: true, deletedKeys: keys.length };
      }

      return { success: true, deletedKeys: 0 };
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Middleware to add rate limit headers for monitoring
   */
  rateLimitHeaders() {
    return (req, res, next) => {
      // Add custom headers for rate limit monitoring
      res.set({
        'X-RateLimit-Requested-By': req.user?.id || 'anonymous',
        'X-RateLimit-Timestamp': new Date().toISOString(),
      });
      next();
    };
  }
}

module.exports = new RateLimiter();