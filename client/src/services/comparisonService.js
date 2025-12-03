import api from './api';

/**
 * Product Comparison Service
 * Handles product comparison and saved comparisons
 */

/**
 * Save product comparison
 * @param {object} data - Comparison data
 * @returns {Promise} Saved comparison
 */
export const saveComparison = async (data) => {
  const response = await api.post('/product-comparison/save', data);
  return response.data;
};

/**
 * Get user's saved comparisons
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise} User's comparisons
 */
export const getUserComparisons = async (page = 1, limit = 10) => {
  const response = await api.get('/product-comparison', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Compare multiple products
 * @param {array} productIds - Array of product IDs to compare
 * @returns {Promise} Comparison results
 */
export const compareProducts = async (productIds) => {
  const response = await api.post('/product-comparison/compare', {
    productIds,
  });
  return response.data;
};

/**
 * Delete saved comparison
 * @param {string} comparisonId - Comparison ID
 * @returns {Promise} Deletion confirmation
 */
export const deleteComparison = async (comparisonId) => {
  const response = await api.delete(`/product-comparison/${comparisonId}`);
  return response.data;
};

export default {
  saveComparison,
  getUserComparisons,
  compareProducts,
  deleteComparison,
};
