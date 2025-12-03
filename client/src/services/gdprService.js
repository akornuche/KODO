import api from './api';

/**
 * GDPR Service
 * Handles data privacy and GDPR compliance
 */

/**
 * Export user data
 * @returns {Promise} Export data URL
 */
export const exportUserData = async () => {
  const response = await api.get('/gdpr/export-data');
  return response.data;
};

/**
 * Download exported data file
 * @param {string} fileName - Export file name
 * @returns {Promise} File blob
 */
export const downloadExport = async (fileName) => {
  const response = await api.get(`/gdpr/download-export/${fileName}`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Delete user account
 * @param {string} confirmation - Confirmation string ("DELETE")
 * @returns {Promise} Deletion confirmation
 */
export const deleteUserAccount = async (confirmation) => {
  const response = await api.delete('/gdpr/delete-account', {
    data: { confirmation },
  });
  return response.data;
};

/**
 * Get consent preferences
 * @returns {Promise} Consent preferences
 */
export const getConsent = async () => {
  const response = await api.get('/gdpr/consent');
  return response.data;
};

/**
 * Update consent preferences
 * @param {object} consent - Consent preferences
 * @returns {Promise} Updated consent
 */
export const updateConsent = async (consent) => {
  const response = await api.put('/gdpr/consent', consent);
  return response.data;
};

/**
 * Get privacy policy acceptance status
 * @returns {Promise} Privacy acceptance data
 */
export const getPrivacyAcceptance = async () => {
  const response = await api.get('/gdpr/privacy-acceptance');
  return response.data;
};

/**
 * Request data rectification
 * @param {object} data - Rectification request data
 * @returns {Promise} Request confirmation
 */
export const rectifyData = async (data) => {
  const response = await api.post('/gdpr/rectify', data);
  return response.data;
};

export default {
  exportUserData,
  downloadExport,
  deleteUserAccount,
  getConsent,
  updateConsent,
  getPrivacyAcceptance,
  rectifyData,
};
