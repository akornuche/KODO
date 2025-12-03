import api from './api';

/**
 * Bundle Service
 * Handles cross-sell, upsell, and product bundles
 */

/**
 * Get cross-sell suggestions
 * @param {string} productId - Product ID
 * @param {number} limit - Number of suggestions
 * @returns {Promise} Cross-sell suggestions
 */
export const getCrossSellSuggestions = async (productId, limit = 4) => {
  const response = await api.get(`/bundles/cross-sell/${productId}`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Get upsell suggestions
 * @param {string} productId - Product ID
 * @param {number} limit - Number of suggestions
 * @returns {Promise} Upsell suggestions
 */
export const getUpsellSuggestions = async (productId, limit = 4) => {
  const response = await api.get(`/bundles/upsell/${productId}`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Create product bundle
 * @param {object} data - Bundle data
 * @returns {Promise} Created bundle
 */
export const createBundle = async (data) => {
  const response = await api.post('/bundles', data);
  return response.data;
};

/**
 * Get cart bundle recommendations
 * @param {array} productIds - Product IDs in cart
 * @returns {Promise} Bundle recommendations
 */
export const getCartBundleRecommendations = async (productIds) => {
  const response = await api.post('/bundles/cart-recommendations', {
    productIds,
  });
  return response.data;
};

export default {
  getCrossSellSuggestions,
  getUpsellSuggestions,
  createBundle,
  getCartBundleRecommendations,
};
