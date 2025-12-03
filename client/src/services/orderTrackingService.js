import api from './api';

/**
 * Order Tracking Service
 * Provides order tracking and status updates
 */

/**
 * Get detailed order tracking
 * @param {string} orderId - Order ID
 * @returns {Promise} Order tracking data
 */
export const getOrderTracking = async (orderId) => {
  const response = await api.get(`/order-tracking/${orderId}`);
  return response.data;
};

/**
 * Get public order tracking (no auth required)
 * @param {string} orderId - Order ID
 * @param {string} email - Buyer email
 * @returns {Promise} Order tracking data
 */
export const getPublicOrderTracking = async (orderId, email) => {
  const response = await api.get(`/order-tracking/public/${orderId}/${email}`);
  return response.data;
};

/**
 * Update order status (seller/admin)
 * @param {string} orderId - Order ID
 * @param {object} data - Status update data
 * @returns {Promise} Updated order
 */
export const updateOrderStatus = async (orderId, data) => {
  const response = await api.put(`/order-tracking/${orderId}/status`, data);
  return response.data;
};

export default {
  getOrderTracking,
  getPublicOrderTracking,
  updateOrderStatus,
};
