import api from './api';

const addressService = {
  // Get all addresses
  async getAddresses() {
    const response = await api.get('/addresses');
    return response.data;
  },

  // Get default address
  async getDefaultAddress() {
    const response = await api.get('/addresses/default');
    return response.data;
  },

  // Get address by ID
  async getAddress(addressId) {
    const response = await api.get(`/addresses/${addressId}`);
    return response.data;
  },

  // Create address
  async createAddress(data) {
    const response = await api.post('/addresses', data);
    return response.data;
  },

  // Update address
  async updateAddress(addressId, data) {
    const response = await api.put(`/addresses/${addressId}`, data);
    return response.data;
  },

  // Delete address
  async deleteAddress(addressId) {
    const response = await api.delete(`/addresses/${addressId}`);
    return response.data;
  },

  // Set default address
  async setDefaultAddress(addressId) {
    const response = await api.put(`/addresses/${addressId}/set-default`);
    return response.data;
  },
};

export default addressService;
