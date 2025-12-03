import api from './api';

const invoiceService = {
  // Get all invoices
  async getInvoices(params = {}) {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  // Get invoice by ID
  async getInvoice(invoiceId) {
    const response = await api.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  // Generate invoice for order
  async generateInvoice(orderId) {
    const response = await api.post(`/invoices/generate/${orderId}`);
    return response.data;
  },

  // Download invoice PDF
  async downloadInvoice(invoiceId) {
    const response = await api.get(`/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Calculate tax estimate
  async calculateTax(items) {
    const response = await api.post('/invoices/calculate-tax', { items });
    return response.data;
  },
};

export default invoiceService;
