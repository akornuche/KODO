import api from './api';

const supportService = {
  // Get support tickets
  async getTickets(params = {}) {
    const response = await api.get('/support/tickets', { params });
    return response.data;
  },

  // Get ticket by ID
  async getTicket(ticketId) {
    const response = await api.get(`/support/tickets/${ticketId}`);
    return response.data;
  },

  // Create ticket
  async createTicket(data) {
    const response = await api.post('/support/tickets', data);
    return response.data;
  },

  // Add reply to ticket
  async addReply(ticketId, message) {
    const response = await api.post(`/support/tickets/${ticketId}/reply`, { message });
    return response.data;
  },

  // Close ticket
  async closeTicket(ticketId) {
    const response = await api.put(`/support/tickets/${ticketId}/close`);
    return response.data;
  },

  // Reopen ticket
  async reopenTicket(ticketId) {
    const response = await api.put(`/support/tickets/${ticketId}/reopen`);
    return response.data;
  },

  // Assign ticket (admin only)
  async assignTicket(ticketId, assigneeId) {
    const response = await api.put(`/support/tickets/${ticketId}/assign`, { assigneeId });
    return response.data;
  },
};

export default supportService;
