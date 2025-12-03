import api from './api';

const settingsService = {
  // Get user settings
  async getSettings() {
    const response = await api.get('/settings');
    return response.data;
  },

  // Update general settings
  async updateSettings(data) {
    const response = await api.put('/settings', data);
    return response.data;
  },

  // Update notification settings
  async updateNotifications(data) {
    const response = await api.put('/settings/notifications', data);
    return response.data;
  },

  // Update privacy settings
  async updatePrivacy(data) {
    const response = await api.put('/settings/privacy', data);
    return response.data;
  },

  // Enable 2FA
  async enable2FA(data) {
    const response = await api.post('/settings/2fa/enable', data);
    return response.data;
  },

  // Disable 2FA
  async disable2FA(password) {
    const response = await api.post('/settings/2fa/disable', { password });
    return response.data;
  },

  // Reset settings to default
  async resetSettings() {
    const response = await api.post('/settings/reset');
    return response.data;
  },
};

export default settingsService;
