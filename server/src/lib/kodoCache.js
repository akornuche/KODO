const cacheManager = require('./cacheManager');
const logger = require('./logger');

/**
 * KODO-specific caching service
 * Provides caching strategies for products, users, search, and analytics
 */
class KodoCache {
  constructor() {
    this.cacheManager = cacheManager;
    this.prefixes = {
      PRODUCT: 'product',
      PRODUCTS_LIST: 'products:list',
      USER: 'user',
      USER_DASHBOARD: 'user:dashboard',
      SEARCH: 'search',
      ANALYTICS: 'analytics',
      CATEGORY: 'category',
      LOCATION: 'location'
    };
  }

  /**
   * Initialize cache connection
   */
  async initialize() {
    await this.cacheManager.initialize();
  }

  /**
   * Product caching methods
   */
  async getProduct(productId) {
    const key = this.cacheManager.createKey(this.prefixes.PRODUCT, productId);
    return await this.cacheManager.get(key);
  }

  async setProduct(productId, productData, ttl = 1800) { // 30 minutes
    const key = this.cacheManager.createKey(this.prefixes.PRODUCT, productId);
    return await this.cacheManager.set(key, productData, ttl);
  }

  async invalidateProduct(productId) {
    const key = this.cacheManager.createKey(this.prefixes.PRODUCT, productId);
    return await this.cacheManager.delete(key);
  }

  /**
   * Products list caching
   */
  async getProductsList(filters = {}) {
    const filterKey = this.generateFilterKey(filters);
    const key = this.cacheManager.createKey(this.prefixes.PRODUCTS_LIST, filterKey);
    return await this.cacheManager.get(key);
  }

  async setProductsList(filters = {}, productsData, ttl = 900) { // 15 minutes
    const filterKey = this.generateFilterKey(filters);
    const key = this.cacheManager.createKey(this.prefixes.PRODUCTS_LIST, filterKey);
    return await this.cacheManager.set(key, productsData, ttl);
  }

  async invalidateProductsList() {
    const pattern = this.cacheManager.createKey(this.prefixes.PRODUCTS_LIST, '*');
    return await this.cacheManager.deletePattern(pattern);
  }

  /**
   * User caching methods
   */
  async getUser(userId) {
    const key = this.cacheManager.createKey(this.prefixes.USER, userId);
    return await this.cacheManager.get(key);
  }

  async setUser(userId, userData, ttl = 3600) { // 1 hour
    const key = this.cacheManager.createKey(this.prefixes.USER, userId);
    return await this.cacheManager.set(key, userData, ttl);
  }

  async invalidateUser(userId) {
    const key = this.cacheManager.createKey(this.prefixes.USER, userId);
    return await this.cacheManager.delete(key);
  }

  /**
   * User dashboard caching
   */
  async getUserDashboard(userId) {
    const key = this.cacheManager.createKey(this.prefixes.USER_DASHBOARD, userId);
    return await this.cacheManager.get(key);
  }

  async setUserDashboard(userId, dashboardData, ttl = 1800) { // 30 minutes
    const key = this.cacheManager.createKey(this.prefixes.USER_DASHBOARD, userId);
    return await this.cacheManager.set(key, dashboardData, ttl);
  }

  async invalidateUserDashboard(userId) {
    const key = this.cacheManager.createKey(this.prefixes.USER_DASHBOARD, userId);
    return await this.cacheManager.delete(key);
  }

  /**
   * Search caching
   */
  async getSearchResults(query, filters = {}) {
    const searchKey = this.generateSearchKey(query, filters);
    const key = this.cacheManager.createKey(this.prefixes.SEARCH, searchKey);
    return await this.cacheManager.get(key);
  }

  async setSearchResults(query, filters = {}, results, ttl = 600) { // 10 minutes
    const searchKey = this.generateSearchKey(query, filters);
    const key = this.cacheManager.createKey(this.prefixes.SEARCH, searchKey);
    return await this.cacheManager.set(key, results, ttl);
  }

  /**
   * Analytics caching
   */
  async getAnalytics(type, params = {}) {
    const paramKey = this.generateParamKey(params);
    const key = this.cacheManager.createKey(this.prefixes.ANALYTICS, type, paramKey);
    return await this.cacheManager.get(key);
  }

  async setAnalytics(type, params = {}, data, ttl = 3600) { // 1 hour
    const paramKey = this.generateParamKey(params);
    const key = this.cacheManager.createKey(this.prefixes.ANALYTICS, type, paramKey);
    return await this.cacheManager.set(key, data, ttl);
  }

  async invalidateAnalytics(type) {
    const pattern = this.cacheManager.createKey(this.prefixes.ANALYTICS, type, '*');
    return await this.cacheManager.deletePattern(pattern);
  }

  /**
   * Category caching
   */
  async getCategories() {
    const key = this.cacheManager.createKey(this.prefixes.CATEGORY, 'all');
    return await this.cacheManager.get(key);
  }

  async setCategories(categories, ttl = 7200) { // 2 hours
    const key = this.cacheManager.createKey(this.prefixes.CATEGORY, 'all');
    return await this.cacheManager.set(key, categories, ttl);
  }

  async invalidateCategories() {
    const key = this.cacheManager.createKey(this.prefixes.CATEGORY, 'all');
    return await this.cacheManager.delete(key);
  }

  /**
   * Location/popular areas caching
   */
  async getPopularLocations() {
    const key = this.cacheManager.createKey(this.prefixes.LOCATION, 'popular');
    return await this.cacheManager.get(key);
  }

  async setPopularLocations(locations, ttl = 3600) { // 1 hour
    const key = this.cacheManager.createKey(this.prefixes.LOCATION, 'popular');
    return await this.cacheManager.set(key, locations, ttl);
  }

  /**
   * Cache warming for popular data
   */
  async warmCache() {
    try {
      logger.info('Starting cache warming...');

      // This would typically be called during app startup
      // to preload frequently accessed data
      // Implementation would depend on your data access layer

      logger.info('Cache warming completed');
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  /**
   * Invalidate all user-related cache for a user
   */
  async invalidateUserCache(userId) {
    const patterns = [
      this.cacheManager.createKey(this.prefixes.USER, userId),
      this.cacheManager.createKey(this.prefixes.USER_DASHBOARD, userId),
      this.cacheManager.createKey(this.prefixes.PRODUCTS_LIST, '*'), // Invalidate product lists as they might include user's products
    ];

    for (const pattern of patterns) {
      await this.cacheManager.deletePattern(pattern);
    }
  }

  /**
   * Invalidate all product-related cache
   */
  async invalidateProductCache() {
    const patterns = [
      this.cacheManager.createKey(this.prefixes.PRODUCT, '*'),
      this.cacheManager.createKey(this.prefixes.PRODUCTS_LIST, '*'),
      this.cacheManager.createKey(this.prefixes.SEARCH, '*'),
    ];

    for (const pattern of patterns) {
      await this.cacheManager.deletePattern(pattern);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.cacheManager.getStats();
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    return await this.cacheManager.clear();
  }

  /**
   * Generate filter key for products list caching
   */
  generateFilterKey(filters) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return sortedFilters || 'default';
  }

  /**
   * Generate search key for search results caching
   */
  generateSearchKey(query, filters = {}) {
    const normalizedQuery = query.toLowerCase().trim();
    const filterKey = this.generateFilterKey(filters);
    return `${normalizedQuery}|${filterKey}`;
  }

  /**
   * Generate parameter key for analytics caching
   */
  generateParamKey(params) {
    return this.generateFilterKey(params);
  }

  /**
   * Create cache middleware for specific routes
   */
  createCacheMiddleware(keyGenerator, ttl) {
    return this.cacheManager.cacheMiddleware(keyGenerator, ttl);
  }

  /**
   * Close cache connection
   */
  async close() {
    await this.cacheManager.close();
  }
}

module.exports = new KodoCache();