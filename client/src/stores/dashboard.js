import { defineStore } from 'pinia';
import dashboardService, { bidService, orderService, deliveryService } from '@/services/dashboardService';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    // Stats
    buyerStats: null,
    sellerStats: null,
    courierStats: null,
    adminStats: null,

    // Bids
    myBids: [],
    receivedBids: [],

    // Orders
    myOrders: [],
    mySales: [],

    // Deliveries
    availableDeliveries: [],
    myDeliveries: [],

    // Loading states
    loading: {
      stats: false,
      bids: false,
      orders: false,
      deliveries: false,
    },

    // Error states
    error: {
      stats: null,
      bids: null,
      orders: null,
      deliveries: null,
    },
  }),

  getters: {
    // Buyer getters
    activeBidsCount: (state) => state.myBids.filter((b) => b.status === 'pending').length,
    pendingOrdersCount: (state) => state.myOrders.filter((o) => o.status === 'pending').length,

    // Seller getters
    pendingOffersCount: (state) => state.receivedBids.filter((b) => b.status === 'pending').length,
    activeOrdersCount: (state) => state.mySales.filter((o) => ['pending', 'paid', 'shipped'].includes(o.status)).length,

    // Courier getters
    activeDeliveriesCount: (state) => state.myDeliveries.filter((d) => ['assigned', 'picked_up'].includes(d.status)).length,
    availableDeliveriesCount: (state) => state.availableDeliveries.length,
  },

  actions: {
    // Fetch buyer dashboard data
    async fetchBuyerDashboard() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        this.buyerStats = await dashboardService.getBuyerStats();
        await Promise.all([this.fetchMyBids(), this.fetchMyOrders()]);
      } catch (error) {
        this.error.stats = error.response?.data?.message || 'Failed to load dashboard';
        throw error;
      } finally {
        this.loading.stats = false;
      }
    },

    // Fetch seller dashboard data
    async fetchSellerDashboard() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        this.sellerStats = await dashboardService.getSellerStats();
        await Promise.all([this.fetchReceivedBids(), this.fetchMySales()]);
      } catch (error) {
        this.error.stats = error.response?.data?.message || 'Failed to load dashboard';
        throw error;
      } finally {
        this.loading.stats = false;
      }
    },

    // Fetch courier dashboard data
    async fetchCourierDashboard() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        this.courierStats = await dashboardService.getCourierStats();
        await Promise.all([this.fetchAvailableDeliveries(), this.fetchMyDeliveries()]);
      } catch (error) {
        this.error.stats = error.response?.data?.message || 'Failed to load dashboard';
        throw error;
      } finally {
        this.loading.stats = false;
      }
    },

    // Fetch admin dashboard data
    async fetchAdminDashboard() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        this.adminStats = await dashboardService.getAdminStats();
      } catch (error) {
        this.error.stats = error.response?.data?.message || 'Failed to load dashboard';
        throw error;
      } finally {
        this.loading.stats = false;
      }
    },

    // Bids
    async fetchMyBids(params = {}) {
      this.loading.bids = true;
      this.error.bids = null;
      try {
        const data = await bidService.getMyBids(params);
        this.myBids = data.bids || data;
      } catch (error) {
        this.error.bids = error.response?.data?.message || 'Failed to load bids';
        throw error;
      } finally {
        this.loading.bids = false;
      }
    },

    async fetchReceivedBids(params = {}) {
      this.loading.bids = true;
      this.error.bids = null;
      try {
        const data = await bidService.getBidsOnMyProducts(params);
        this.receivedBids = data.bids || data;
      } catch (error) {
        this.error.bids = error.response?.data?.message || 'Failed to load bids';
        throw error;
      } finally {
        this.loading.bids = false;
      }
    },

    async createBid(bidData) {
      try {
        const newBid = await bidService.createBid(bidData);
        this.myBids.unshift(newBid);
        return newBid;
      } catch (error) {
        throw error;
      }
    },

    async submitOffer(bidId, offerData) {
      try {
        const updatedBid = await bidService.submitOffer(bidId, offerData);
        const index = this.receivedBids.findIndex((b) => b.id === bidId);
        if (index !== -1) {
          this.receivedBids[index] = updatedBid;
        }
        return updatedBid;
      } catch (error) {
        throw error;
      }
    },

    async acceptOffer(bidId) {
      try {
        const updatedBid = await bidService.acceptOffer(bidId);
        const index = this.myBids.findIndex((b) => b.id === bidId);
        if (index !== -1) {
          this.myBids[index] = updatedBid;
        }
        return updatedBid;
      } catch (error) {
        throw error;
      }
    },

    async rejectOffer(bidId) {
      try {
        const updatedBid = await bidService.rejectOffer(bidId);
        const index = this.myBids.findIndex((b) => b.id === bidId);
        if (index !== -1) {
          this.myBids[index] = updatedBid;
        }
        return updatedBid;
      } catch (error) {
        throw error;
      }
    },

    // Orders
    async fetchMyOrders(params = {}) {
      this.loading.orders = true;
      this.error.orders = null;
      try {
        const data = await orderService.getMyOrders(params);
        this.myOrders = data.orders || data;
      } catch (error) {
        this.error.orders = error.response?.data?.message || 'Failed to load orders';
        throw error;
      } finally {
        this.loading.orders = false;
      }
    },

    async fetchMySales(params = {}) {
      this.loading.orders = true;
      this.error.orders = null;
      try {
        const data = await orderService.getSales(params);
        this.mySales = data.orders || data;
      } catch (error) {
        this.error.orders = error.response?.data?.message || 'Failed to load sales';
        throw error;
      } finally {
        this.loading.orders = false;
      }
    },

    // Deliveries
    async fetchAvailableDeliveries(params = {}) {
      this.loading.deliveries = true;
      this.error.deliveries = null;
      try {
        const data = await deliveryService.getAvailableDeliveries(params);
        this.availableDeliveries = data.deliveries || data;
      } catch (error) {
        this.error.deliveries = error.response?.data?.message || 'Failed to load deliveries';
        throw error;
      } finally {
        this.loading.deliveries = false;
      }
    },

    async fetchMyDeliveries(params = {}) {
      this.loading.deliveries = true;
      this.error.deliveries = null;
      try {
        const data = await deliveryService.getMyDeliveries(params);
        this.myDeliveries = data.deliveries || data;
      } catch (error) {
        this.error.deliveries = error.response?.data?.message || 'Failed to load deliveries';
        throw error;
      } finally {
        this.loading.deliveries = false;
      }
    },

    async acceptDelivery(deliveryId) {
      try {
        const delivery = await deliveryService.acceptDelivery(deliveryId);
        // Remove from available, add to my deliveries
        this.availableDeliveries = this.availableDeliveries.filter((d) => d.id !== deliveryId);
        this.myDeliveries.unshift(delivery);
        return delivery;
      } catch (error) {
        throw error;
      }
    },

    async updateDeliveryStatus(deliveryId, status) {
      try {
        const updatedDelivery = await deliveryService.updateDeliveryStatus(deliveryId, status);
        const index = this.myDeliveries.findIndex((d) => d.id === deliveryId);
        if (index !== -1) {
          this.myDeliveries[index] = updatedDelivery;
        }
        return updatedDelivery;
      } catch (error) {
        throw error;
      }
    },
  },
});
