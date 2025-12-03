import api from './apiClient';

export const chatService = {
  // Get all conversations
  async getConversations() {
    const response = await api.get('/api/chat/conversations');
    return response.data;
  },

  // Get or create conversation with user
  async getOrCreateConversation(otherUserId) {
    const response = await api.get(`/api/chat/conversations/${otherUserId}`);
    return response.data;
  },

  // Get messages for conversation
  async getMessages(conversationId, params = {}) {
    const response = await api.get(`/api/chat/${conversationId}/messages`, { params });
    return response.data;
  },

  // Send message
  async sendMessage(conversationId, content) {
    const response = await api.post(`/api/chat/${conversationId}/messages`, { content });
    return response.data;
  },

  // Mark messages as read
  async markAsRead(conversationId) {
    const response = await api.put(`/api/chat/${conversationId}/read`);
    return response.data;
  },

  // Delete message
  async deleteMessage(messageId) {
    const response = await api.delete(`/api/chat/messages/${messageId}`);
    return response.data;
  },
};

export default chatService;
