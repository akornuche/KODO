import api from './api';

const returnService = {
  // Get return requests
  async getReturns(params = {}) {
    const response = await api.get('/returns', { params });
    return response.data;
  },

  // Get return request by ID
  async getReturn(returnId) {
    const response = await api.get(`/returns/${returnId}`);
    return response.data;
  },

  // Create return request
  async createReturn(data) {
    const response = await api.post('/returns', data);
    return response.data;
  },

  // Cancel return request
  async cancelReturn(returnId) {
    const response = await api.put(`/returns/${returnId}/cancel`);
    return response.data;
  },

  // Approve return (seller only)
  async approveReturn(returnId) {
    const response = await api.put(`/returns/${returnId}/approve`);
    return response.data;
  },

  // Reject return (seller only)
  async rejectReturn(returnId, reason) {
    const response = await api.put(`/returns/${returnId}/reject`, { reason });
    return response.data;
  },

  // Complete return (admin only)
  async completeReturn(returnId) {
    const response = await api.put(`/returns/${returnId}/complete`);
    return response.data;
  },
};

export default returnService;
