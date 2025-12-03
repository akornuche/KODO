import apiClient from './apiClient';

/**
 * Admin Service
 * API integration for admin operations
 */

export const adminService = {
  // Statistics
  getStats: async () => {
    const response = await apiClient.get('/api/admin/stats');
    return response.data;
  },

  // User Management
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/api/admin/users', { params });
    return response.data;
  },

  getUser: async (userId) => {
    const response = await apiClient.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await apiClient.put(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Product Management
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/api/admin/products', { params });
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await apiClient.delete(`/api/admin/products/${productId}`);
    return response.data;
  },

  // Dispute Management
  getDisputes: async (params = {}) => {
    const response = await apiClient.get('/api/admin/disputes', { params });
    return response.data;
  },

  resolveDispute: async (disputeId, resolution) => {
    const response = await apiClient.post(`/api/admin/disputes/${disputeId}/resolve`, resolution);
    return response.data;
  },

  // Analytics
  getAnalytics: async (params = {}) => {
    const response = await apiClient.get('/api/admin/analytics', { params });
    return response.data;
  },
};

export default adminService;
