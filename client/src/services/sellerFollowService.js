import api from './api';

/**
 * Seller Follow Service
 * Handles following/unfollowing sellers
 */

/**
 * Follow a seller
 * @param {string} sellerId - Seller ID
 * @returns {Promise<Object>} Success message
 */
export const followSeller = async (sellerId) => {
  const response = await api.post(`/sellers/${sellerId}/follow`);
  return response.data;
};

/**
 * Unfollow a seller
 * @param {string} sellerId - Seller ID
 * @returns {Promise<Object>} Success message
 */
export const unfollowSeller = async (sellerId) => {
  const response = await api.delete(`/sellers/${sellerId}/follow`);
  return response.data;
};

/**
 * Get followed sellers
 * @param {number} page - Page number
 * @param {number} limit - Sellers per page
 * @returns {Promise<Object>} Followed sellers
 */
export const getFollowedSellers = async (page = 1, limit = 20) => {
  const response = await api.get('/sellers/following', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get seller followers
 * @param {string} sellerId - Seller ID
 * @param {number} page - Page number
 * @param {number} limit - Followers per page
 * @returns {Promise<Object>} Seller followers
 */
export const getSellerFollowers = async (sellerId, page = 1, limit = 20) => {
  const response = await api.get(`/sellers/${sellerId}/followers`, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Check if following seller
 * @param {string} sellerId - Seller ID
 * @returns {Promise<Object>} Following status
 */
export const checkIfFollowing = async (sellerId) => {
  const response = await api.get(`/sellers/${sellerId}/follow/check`);
  return response.data;
};

/**
 * Get new products from followed sellers
 * @param {number} limit - Number of products to return
 * @returns {Promise<Object>} New products from followed sellers
 */
export const getNewProductsFromFollowedSellers = async (limit = 20) => {
  const response = await api.get('/sellers/following/new-products', {
    params: { limit },
  });
  return response.data;
};

export default {
  followSeller,
  unfollowSeller,
  getFollowedSellers,
  getSellerFollowers,
  checkIfFollowing,
  getNewProductsFromFollowedSellers,
};
