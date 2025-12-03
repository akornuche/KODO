import api from './api';

/**
 * Guest Checkout Service
 * Handles guest checkout and order tracking
 */

/**
 * Create guest checkout session
 * @param {object} data - Guest session data
 * @returns {Promise} Guest session token
 */
export const createGuestSession = async (data) => {
  const response = await api.post('/guest-checkout/session', data);
  return response.data;
};

/**
 * Complete guest checkout
 * @param {object} data - Order data
 * @returns {Promise} Order confirmation
 */
export const guestCheckout = async (data) => {
  const response = await api.post('/guest-checkout/order', data);
  return response.data;
};

/**
 * Convert guest account to registered
 * @param {object} data - Email and password
 * @returns {Promise} Conversion confirmation
 */
export const convertGuestAccount = async (data) => {
  const response = await api.post('/guest-checkout/convert', data);
  return response.data;
};

/**
 * Track guest order
 * @param {string} orderId - Order ID
 * @param {string} email - Guest email
 * @returns {Promise} Order tracking data
 */
export const trackGuestOrder = async (orderId, email) => {
  const response = await api.get(`/guest-checkout/track/${orderId}/${email}`);
  return response.data;
};

export default {
  createGuestSession,
  guestCheckout,
  convertGuestAccount,
  trackGuestOrder,
};
