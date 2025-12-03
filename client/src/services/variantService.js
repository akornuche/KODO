import api from './api';

/**
 * Product Variant Service
 * Handles product variants and inventory
 */

/**
 * Get variants for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Variants data
 */
export const getProductVariants = async (productId) => {
  const response = await api.get(`/variants/products/${productId}/variants`);
  return response.data;
};

/**
 * Create a new variant
 * @param {string} productId - Product ID
 * @param {Object} variantData - Variant details
 * @returns {Promise<Object>} Created variant
 */
export const createVariant = async (productId, variantData) => {
  const response = await api.post(`/variants/products/${productId}/variants`, variantData);
  return response.data;
};

/**
 * Update a variant
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID
 * @param {Object} variantData - Updated variant details
 * @returns {Promise<Object>} Updated variant
 */
export const updateVariant = async (productId, variantId, variantData) => {
  const response = await api.put(`/variants/products/${productId}/variants/${variantId}`, variantData);
  return response.data;
};

/**
 * Delete a variant
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>} Success message
 */
export const deleteVariant = async (productId, variantId) => {
  const response = await api.delete(`/variants/products/${productId}/variants/${variantId}`);
  return response.data;
};

/**
 * Update stock quantity for a variant
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID
 * @param {number} stockQuantity - New stock quantity
 * @returns {Promise<Object>} Updated variant
 */
export const updateStock = async (productId, variantId, stockQuantity) => {
  const response = await api.put(`/variants/products/${productId}/variants/${variantId}/stock`, {
    stockQuantity,
  });
  return response.data;
};

/**
 * Get low stock variants for seller
 * @returns {Promise<Object>} Low stock variants
 */
export const getLowStockVariants = async () => {
  const response = await api.get('/variants/low-stock');
  return response.data;
};

/**
 * Bulk update stock quantities
 * @param {Array<Object>} updates - Array of {variantId, stockQuantity}
 * @returns {Promise<Object>} Success message
 */
export const bulkUpdateStock = async (updates) => {
  const response = await api.post('/variants/bulk-update-stock', { updates });
  return response.data;
};

export default {
  getProductVariants,
  createVariant,
  updateVariant,
  deleteVariant,
  updateStock,
  getLowStockVariants,
  bulkUpdateStock,
};
