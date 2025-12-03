import apiClient from './apiClient';

/**
 * Dashboard Service
 * API integration for dashboard statistics and data
 */

export const dashboardService = {
  // Buyer Dashboard
  getBuyerStats: async () => {
    const response = await apiClient.get('/api/users/dashboard/buyer');
    return response.data;
  },

  // Seller Dashboard
  getSellerStats: async () => {
    const response = await apiClient.get('/api/users/dashboard/seller');
    return response.data;
  },

  // Courier Dashboard
  getCourierStats: async () => {
    const response = await apiClient.get('/api/users/dashboard/courier');
    return response.data;
  },

  // Admin Dashboard (for Task 28)
  getAdminStats: async () => {
    const response = await apiClient.get('/api/admin/stats');
    return response.data;
  },
};

export const bidService = {
  // Get user's bids (as buyer)
  getMyBids: async (params = {}) => {
    const response = await apiClient.get('/api/bids/my-bids', { params });
    return response.data;
  },

  // Get bids on user's products (as seller)
  getBidsOnMyProducts: async (params = {}) => {
    const response = await apiClient.get('/api/bids/received', { params });
    return response.data;
  },

  // Get all requests/bids (feed for sellers)
  getAllRequests: async (params = {}) => {
    const response = await apiClient.get('/api/requests', { params });
    return response.data;
  },

  // Submit an offer (seller responding to bid)
  submitOffer: async (bidId, offerData) => {
    const response = await apiClient.post(`/api/bids/${bidId}/offer`, offerData);
    return response.data;
  },

  // Accept an offer (buyer accepting seller's offer)
  acceptOffer: async (bidId) => {
    const response = await apiClient.post(`/api/bids/${bidId}/accept`);
    return response.data;
  },

  // Reject an offer
  rejectOffer: async (bidId) => {
    const response = await apiClient.post(`/api/bids/${bidId}/reject`);
    return response.data;
  },
};

export const orderService = {
  // Get user's orders
  getMyOrders: async (params = {}) => {
    const response = await apiClient.get('/api/orders/my-orders', { params });
    return response.data;
  },

  // Get orders for user's products (as seller)
  getSales: async (params = {}) => {
    const response = await apiClient.get('/api/orders/sales', { params });
    return response.data;
  },

  // Get single order
  getOrder: async (orderId) => {
    const response = await apiClient.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // Create order from accepted bid
  createOrder: async (orderData) => {
    const response = await apiClient.post('/api/orders', orderData);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(`/api/orders/${orderId}/status`, { status });
    return response.data;
  },

  // Create payment intent
  createPaymentIntent: async (orderId) => {
    const response = await apiClient.post(`/api/orders/${orderId}/payment`);
    return response.data;
  },

  // Confirm payment
  confirmPayment: async (orderId, paymentIntentId) => {
    const response = await apiClient.post(`/api/orders/${orderId}/confirm-payment`, {
      paymentIntentId,
    });
    return response.data;
  },

  // Pay for order
  payOrder: async (orderId, paymentData = {}) => {
    const response = await apiClient.post(`/api/orders/${orderId}/pay`, paymentData);
    return response.data;
  },
};

export const deliveryService = {
  // Get available deliveries (for couriers)
  getAvailableDeliveries: async (params = {}) => {
    const response = await apiClient.get('/api/deliveries/available', { params });
    return response.data;
  },

  // Get courier's active deliveries
  getMyDeliveries: async (params = {}) => {
    const response = await apiClient.get('/api/deliveries/my-deliveries', { params });
    return response.data;
  },

  // Accept a delivery
  acceptDelivery: async (deliveryId) => {
    const response = await apiClient.post(`/api/deliveries/${deliveryId}/accept`);
    return response.data;
  },

  // Update delivery status
  updateDeliveryStatus: async (deliveryId, status) => {
    const response = await apiClient.put(`/api/deliveries/${deliveryId}/status`, { status });
    return response.data;
  },

  // Update location
  updateLocation: async (deliveryId, location) => {
    const response = await apiClient.put(`/api/deliveries/${deliveryId}/location`, location);
    return response.data;
  },

  // Get delivery tracking
  getDeliveryTracking: async (deliveryId) => {
    const response = await apiClient.get(`/api/deliveries/${deliveryId}/tracking`);
    return response.data;
  },
};

export default {
  dashboardService,
  bidService,
  orderService,
  deliveryService,
};
