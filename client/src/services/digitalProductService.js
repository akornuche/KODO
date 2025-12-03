import api from './api';

/**
 * Digital Product Service
 * Handles digital product downloads and license management
 */

/**
 * Generate download token for digital product
 * @param {string} productId - Product ID
 * @returns {Promise} Download token data
 */
export const generateDownloadToken = async (productId) => {
  const response = await api.post('/digital-products/generate-token', {
    productId,
  });
  return response.data;
};

/**
 * Download digital product file
 * @param {string} token - Download token
 * @returns {Promise} File blob
 */
export const downloadDigitalProduct = async (token) => {
  const response = await api.get(`/digital-products/download/${token}`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Get user's digital products
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise} User's digital products
 */
export const getMyDigitalProducts = async (page = 1, limit = 10) => {
  const response = await api.get('/digital-products/my-products', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get download stats for seller
 * @param {string} productId - Product ID
 * @returns {Promise} Download statistics
 */
export const getDownloadStats = async (productId) => {
  const response = await api.get('/digital-products/stats', {
    params: { productId },
  });
  return response.data;
};

export default {
  generateDownloadToken,
  downloadDigitalProduct,
  getMyDigitalProducts,
  getDownloadStats,
};
