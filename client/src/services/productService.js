import api from './apiClient';

// Product API endpoints
export const productService = {
  // Get all products with filters
  async getProducts(params = {}) {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  // Search products
  async searchProducts(params = {}) {
    const response = await api.get('/api/products/search', { params });
    return response.data;
  },

  // Get product by ID
  async getProduct(id) {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  // Create product (seller only)
  async createProduct(productData) {
    const response = await api.post('/api/products', productData);
    return response.data;
  },

  // Update product (seller/admin)
  async updateProduct(id, productData) {
    const response = await api.put(`/api/products/${id}`, productData);
    return response.data;
  },

  // Delete product (seller/admin)
  async deleteProduct(id) {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },

  // Upload product images
  async uploadImages(productId, files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });
    const response = await api.post(`/api/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Delete product image
  async deleteImage(productId, imageIndex) {
    const response = await api.delete(`/api/products/${productId}/images/${imageIndex}`);
    return response.data;
  },
};

// Review API endpoints
export const reviewService = {
  // Get product reviews
  async getProductReviews(productId, params = {}) {
    const response = await api.get(`/api/reviews/product/${productId}`, { params });
    return response.data;
  },

  // Create review
  async createReview(reviewData) {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },

  // Update review
  async updateReview(reviewId, reviewData) {
    const response = await api.put(`/api/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  // Delete review
  async deleteReview(reviewId) {
    const response = await api.delete(`/api/reviews/${reviewId}`);
    return response.data;
  },
};

export default {
  ...productService,
  reviews: reviewService,
};
