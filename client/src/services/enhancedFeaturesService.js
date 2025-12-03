import api from './api';

/**
 * Size Guide, Subscription, Gift Card, and Badge Services
 */

// ============= SIZE GUIDE SERVICE =============
export const sizeGuideService = {
  /**
   * Create size guide
   * @param {object} data - Size guide data
   * @returns {Promise} Created size guide
   */
  create: async (data) => {
    const response = await api.post('/size-guides', data);
    return response.data;
  },

  /**
   * Get size guides for product
   * @param {string} productId - Product ID
   * @returns {Promise} Size guides
   */
  getByProduct: async (productId) => {
    const response = await api.get(`/size-guides/product/${productId}`);
    return response.data;
  },

  /**
   * Update size guide
   * @param {string} id - Size guide ID
   * @param {object} data - Updated data
   * @returns {Promise} Updated size guide
   */
  update: async (id, data) => {
    const response = await api.put(`/size-guides/${id}`, data);
    return response.data;
  },

  /**
   * Delete size guide
   * @param {string} id - Size guide ID
   * @returns {Promise} Deletion confirmation
   */
  delete: async (id) => {
    const response = await api.delete(`/size-guides/${id}`);
    return response.data;
  },
};

// ============= SUBSCRIPTION SERVICE =============
export const subscriptionService = {
  /**
   * Create subscription plan
   * @param {object} data - Subscription plan data
   * @returns {Promise} Created plan
   */
  createPlan: async (data) => {
    const response = await api.post('/subscriptions/plans', data);
    return response.data;
  },

  /**
   * Subscribe to product
   * @param {object} data - Subscription data
   * @returns {Promise} Subscription confirmation
   */
  subscribe: async (data) => {
    const response = await api.post('/subscriptions/subscribe', data);
    return response.data;
  },

  /**
   * Get user subscriptions
   * @returns {Promise} User's subscriptions
   */
  getMySubscriptions: async () => {
    const response = await api.get('/subscriptions/my-subscriptions');
    return response.data;
  },

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise} Cancellation confirmation
   */
  cancel: async (subscriptionId) => {
    const response = await api.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  },
};

// ============= GIFT CARD SERVICE =============
export const giftCardService = {
  /**
   * Create gift card
   * @param {object} data - Gift card data
   * @returns {Promise} Created gift card
   */
  create: async (data) => {
    const response = await api.post('/gift-cards/create', data);
    return response.data;
  },

  /**
   * Check gift card balance
   * @param {string} code - Gift card code
   * @returns {Promise} Balance information
   */
  checkBalance: async (code) => {
    const response = await api.get(`/gift-cards/balance/${code}`);
    return response.data;
  },

  /**
   * Apply gift card to order
   * @param {object} data - Gift card application data
   * @returns {Promise} Application confirmation
   */
  apply: async (data) => {
    const response = await api.post('/gift-cards/apply', data);
    return response.data;
  },

  /**
   * Get user's gift cards
   * @returns {Promise} User's gift cards
   */
  getMyCards: async () => {
    const response = await api.get('/gift-cards/my-cards');
    return response.data;
  },
};

// ============= BADGE SERVICE =============
export const badgeService = {
  /**
   * Get product badges
   * @param {string} productId - Product ID
   * @returns {Promise} Product badges
   */
  getProductBadges: async (productId) => {
    const response = await api.get(`/badges/product/${productId}`);
    return response.data;
  },

  /**
   * Set custom badge
   * @param {object} data - Badge data
   * @returns {Promise} Created badge
   */
  setCustomBadge: async (data) => {
    const response = await api.post('/badges/custom', data);
    return response.data;
  },
};

// ============= SHIPPING LABEL SERVICE =============
export const shippingLabelService = {
  /**
   * Generate shipping label
   * @param {object} data - Shipping label data
   * @returns {Promise} Generated label
   */
  generate: async (data) => {
    const response = await api.post('/shipping-labels/generate', data);
    return response.data;
  },

  /**
   * Get shipping label
   * @param {string} orderId - Order ID
   * @returns {Promise} Shipping label
   */
  get: async (orderId) => {
    const response = await api.get(`/shipping-labels/${orderId}`);
    return response.data;
  },

  /**
   * Get carrier rates
   * @param {object} data - Package details
   * @returns {Promise} Carrier rates
   */
  getRates: async (data) => {
    const response = await api.post('/shipping-labels/rates', data);
    return response.data;
  },

  /**
   * Void shipping label
   * @param {string} orderId - Order ID
   * @returns {Promise} Void confirmation
   */
  void: async (orderId) => {
    const response = await api.delete(`/shipping-labels/${orderId}`);
    return response.data;
  },
};

// ============= REVIEW PHOTO SERVICE =============
export const reviewPhotoService = {
  /**
   * Add photos to review
   * @param {string} reviewId - Review ID
   * @param {object} data - Photos data
   * @returns {Promise} Added photos
   */
  add: async (reviewId, data) => {
    const response = await api.post(`/review-photos/${reviewId}`, data);
    return response.data;
  },

  /**
   * Get review photos
   * @param {string} reviewId - Review ID
   * @returns {Promise} Review photos
   */
  get: async (reviewId) => {
    const response = await api.get(`/review-photos/review/${reviewId}`);
    return response.data;
  },

  /**
   * Delete review photo
   * @param {string} photoId - Photo ID
   * @returns {Promise} Deletion confirmation
   */
  delete: async (photoId) => {
    const response = await api.delete(`/review-photos/${photoId}`);
    return response.data;
  },
};

// ============= BULK UPLOAD SERVICE =============
export const bulkUploadService = {
  /**
   * Upload CSV file
   * @param {FormData} formData - Form data with CSV file
   * @returns {Promise} Upload results
   */
  upload: async (formData) => {
    const response = await api.post('/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Download CSV template
   * @returns {Promise} Template file
   */
  downloadTemplate: async () => {
    const response = await api.get('/bulk-upload/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get upload history
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Upload history
   */
  getHistory: async (page = 1, limit = 10) => {
    const response = await api.get('/bulk-upload/history', {
      params: { page, limit },
    });
    return response.data;
  },
};

// ============= FRAUD DETECTION SERVICE =============
export const fraudDetectionService = {
  /**
   * Analyze fraud risk
   * @param {object} data - Order data for analysis
   * @returns {Promise} Risk analysis
   */
  analyze: async (data) => {
    const response = await api.post('/fraud-detection/analyze', data);
    return response.data;
  },

  /**
   * Get fraud alerts
   * @param {object} params - Query parameters
   * @returns {Promise} Fraud alerts
   */
  getAlerts: async (params = {}) => {
    const response = await api.get('/fraud-detection/alerts', { params });
    return response.data;
  },

  /**
   * Block suspicious user
   * @param {object} data - User ID and reason
   * @returns {Promise} Block confirmation
   */
  blockUser: async (data) => {
    const response = await api.post('/fraud-detection/block-user', data);
    return response.data;
  },

  /**
   * Get fraud statistics
   * @param {number} period - Period in days
   * @returns {Promise} Fraud statistics
   */
  getStats: async (period = 30) => {
    const response = await api.get('/fraud-detection/stats', {
      params: { period },
    });
    return response.data;
  },
};

export default {
  sizeGuideService,
  subscriptionService,
  giftCardService,
  badgeService,
  shippingLabelService,
  reviewPhotoService,
  bulkUploadService,
  fraudDetectionService,
};
