const Redis = require('redis');
const logger = require('./logger');

/**
 * Redis caching utility for the KODO platform
 * Provides caching for frequently accessed data to improve performance
 */
class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = Redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 60000,
          lazyConnect: true,
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis retry attempts exhausted');
            return undefined;
          }
          // Exponential backoff
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      // Continue without Redis in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  /**
   * Set cache value with optional TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      keyValuePairs.forEach(({ key, value }) => {
        const serializedValue = JSON.stringify(value);
        pipeline.setEx(key, ttl, serializedValue);
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple cache values
   */
  async mget(keys) {
    if (!this.isConnected || !this.client) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.client) {
      return { connected: false };
    }

    try {
      const info = await this.client.info();
      const dbSize = await this.client.dbSize();

      return {
        connected: true,
        dbSize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Create cache key with prefix
   */
  createKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Cache middleware for Express routes
   */
  cacheMiddleware(keyGenerator, ttl = this.defaultTTL) {
    return async (req, res, next) => {
      if (!this.isConnected) {
        return next();
      }

      const key = typeof keyGenerator === 'function'
        ? keyGenerator(req)
        : keyGenerator;

      try {
        const cachedData = await this.get(key);
        if (cachedData) {
          logger.debug(`Cache hit for key: ${key}`);
          return res.json(cachedData);
        }

        // Store original json method
        const originalJson = res.json;

        // Override json method to cache response
        res.json = function(data) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(key, data, ttl).catch(err =>
              logger.error('Cache middleware set error:', err)
            );
          }
          return originalJson.call(this, data);
        }.bind(this);

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }
}

module.exports = new CacheManager();