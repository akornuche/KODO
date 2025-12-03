import api from './api';

const wishlistService = {
  // Get wishlist
  async getWishlist() {
    const response = await api.get('/wishlist');
    return response.data;
  },

  // Add product to wishlist
  async addToWishlist(productId) {
    const response = await api.post(`/wishlist/${productId}`);
    return response.data;
  },

  // Remove from wishlist
  async removeFromWishlist(productId) {
    const response = await api.delete(`/wishlist/${productId}`);
    return response.data;
  },

  // Check if product is in wishlist
  async isInWishlist(productId) {
    const response = await api.get(`/wishlist/check/${productId}`);
    return response.data;
  },

  // Clear wishlist
  async clearWishlist() {
    const response = await api.delete('/wishlist');
    return response.data;
  },
};

export default wishlistService;
