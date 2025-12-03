import api from './api';

/**
 * Product Recommendation Service
 * Handles product recommendations and suggestions
 */

/**
 * Get personalized recommendations for user
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<Object>} Recommended products
 */
export const getRecommendations = async (limit = 10) => {
  const response = await api.get('/recommendations', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get similar products
 * @param {string} productId - Product ID
 * @param {number} limit - Number of similar products to return
 * @returns {Promise<Object>} Similar products
 */
export const getSimilarProducts = async (productId, limit = 6) => {
  const response = await api.get(`/recommendations/similar/${productId}`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Get frequently bought together products
 * @param {string} productId - Product ID
 * @param {number} limit - Number of products to return
 * @returns {Promise<Object>} Frequently bought together products
 */
export const getFrequentlyBoughtTogether = async (productId, limit = 4) => {
  const response = await api.get(`/recommendations/frequently-bought/${productId}`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Get recommendations based on browsing history
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<Object>} Recommended products based on history
 */
export const getRecommendationsBasedOnHistory = async (limit = 10) => {
  const response = await api.get('/recommendations/based-on-history', {
    params: { limit },
  });
  return response.data;
};

/**
 * Track product view for recommendations
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Success message
 */
export const trackProductView = async (productId) => {
  const response = await api.post('/recommendations/track-view', {
    productId,
  });
  return response.data;
};

export default {
  getRecommendations,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getRecommendationsBasedOnHistory,
  trackProductView,
};
