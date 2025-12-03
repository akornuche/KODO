import api from './api';

/**
 * Recently Viewed Service
 * Tracks and retrieves browsing history
 */

/**
 * Track product view
 * @param {string} productId - Product ID
 * @param {string} sessionId - Optional session ID for non-authenticated users
 * @returns {Promise} Tracking confirmation
 */
export const trackView = async (productId, sessionId = null) => {
  const response = await api.post('/recently-viewed/track', {
    productId,
    sessionId,
  });
  return response.data;
};

/**
 * Get recently viewed products
 * @param {number} limit - Number of products to retrieve
 * @param {string} sessionId - Optional session ID for non-authenticated users
 * @returns {Promise} Recently viewed products
 */
export const getRecentlyViewed = async (limit = 20, sessionId = null) => {
  const response = await api.get('/recently-viewed', {
    params: { limit, sessionId },
  });
  return response.data;
};

/**
 * Clear recently viewed history
 * @param {string} sessionId - Optional session ID for non-authenticated users
 * @returns {Promise} Clearing confirmation
 */
export const clearRecentlyViewed = async (sessionId = null) => {
  const response = await api.delete('/recently-viewed', {
    data: { sessionId },
  });
  return response.data;
};

export default {
  trackView,
  getRecentlyViewed,
  clearRecentlyViewed,
};
