import api from './api';

/**
 * Seller Analytics Service
 * Provides seller performance metrics and insights
 */

/**
 * Get seller dashboard analytics
 * @param {number} period - Period in days (7, 30, 90, 365)
 * @returns {Promise} Dashboard data
 */
export const getSellerDashboard = async (period = 30) => {
  const response = await api.get('/seller-analytics/dashboard', {
    params: { period },
  });
  return response.data;
};

/**
 * Get product performance metrics
 * @param {object} params - Query parameters
 * @returns {Promise} Product performance data
 */
export const getProductPerformance = async (params = {}) => {
  const response = await api.get('/seller-analytics/products', {
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
      sortBy: params.sortBy || 'revenue',
    },
  });
  return response.data;
};

/**
 * Get sales report
 * @param {object} params - Query parameters
 * @returns {Promise} Sales report data
 */
export const getSalesReport = async (params = {}) => {
  const response = await api.get('/seller-analytics/sales-report', {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      groupBy: params.groupBy || 'day',
    },
  });
  return response.data;
};

/**
 * Get customer insights
 * @returns {Promise} Customer insights data
 */
export const getCustomerInsights = async () => {
  const response = await api.get('/seller-analytics/customers');
  return response.data;
};

export default {
  getSellerDashboard,
  getProductPerformance,
  getSalesReport,
  getCustomerInsights,
};
