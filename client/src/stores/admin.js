import { defineStore } from 'pinia';
import adminService from '@/services/adminService';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    stats: null,
    users: [],
    products: [],
    disputes: [],
    analytics: null,

    loading: {
      stats: false,
      users: false,
      products: false,
      disputes: false,
      analytics: false,
    },

    error: {
      stats: null,
      users: null,
      products: null,
      disputes: null,
      analytics: null,
    },

    pagination: {
      users: { page: 1, limit: 20, total: 0, pages: 0 },
      products: { page: 1, limit: 20, total: 0, pages: 0 },
      disputes: { page: 1, limit: 20, total: 0, pages: 0 },
    },
  }),

  getters: {
    pendingDisputesCount: (state) => state.disputes.filter((d) => d.status === 'pending').length,
    activeUsersCount: (state) => state.users.filter((u) => u.isActive).length,
  },

  actions: {
    async fetchStats() {
      this.loading.stats = true;
      this.error.stats = null;
      try {
        this.stats = await adminService.getStats();
      } catch (error) {
        this.error.stats = error.response?.data?.message || 'Failed to load stats';
        throw error;
      } finally {
        this.loading.stats = false;
      }
    },

    async fetchUsers(params = {}) {
      this.loading.users = true;
      this.error.users = null;
      try {
        const data = await adminService.getUsers({
          ...params,
          page: this.pagination.users.page,
          limit: this.pagination.users.limit,
        });
        this.users = data.users || data;
        if (data.pagination) {
          this.pagination.users = { ...this.pagination.users, ...data.pagination };
        }
      } catch (error) {
        this.error.users = error.response?.data?.message || 'Failed to load users';
        throw error;
      } finally {
        this.loading.users = false;
      }
    },

    async updateUserRole(userId, role) {
      try {
        const updatedUser = await adminService.updateUserRole(userId, role);
        const index = this.users.findIndex((u) => u.id === userId);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        return updatedUser;
      } catch (error) {
        throw error;
      }
    },

    async deleteUser(userId) {
      try {
        await adminService.deleteUser(userId);
        this.users = this.users.filter((u) => u.id !== userId);
      } catch (error) {
        throw error;
      }
    },

    async fetchProducts(params = {}) {
      this.loading.products = true;
      this.error.products = null;
      try {
        const data = await adminService.getProducts({
          ...params,
          page: this.pagination.products.page,
          limit: this.pagination.products.limit,
        });
        this.products = data.products || data;
        if (data.pagination) {
          this.pagination.products = { ...this.pagination.products, ...data.pagination };
        }
      } catch (error) {
        this.error.products = error.response?.data?.message || 'Failed to load products';
        throw error;
      } finally {
        this.loading.products = false;
      }
    },

    async deleteProduct(productId) {
      try {
        await adminService.deleteProduct(productId);
        this.products = this.products.filter((p) => p.id !== productId);
      } catch (error) {
        throw error;
      }
    },

    async fetchDisputes(params = {}) {
      this.loading.disputes = true;
      this.error.disputes = null;
      try {
        const data = await adminService.getDisputes({
          ...params,
          page: this.pagination.disputes.page,
          limit: this.pagination.disputes.limit,
        });
        this.disputes = data.disputes || data;
        if (data.pagination) {
          this.pagination.disputes = { ...this.pagination.disputes, ...data.pagination };
        }
      } catch (error) {
        this.error.disputes = error.response?.data?.message || 'Failed to load disputes';
        throw error;
      } finally {
        this.loading.disputes = false;
      }
    },

    async resolveDispute(disputeId, resolution) {
      try {
        const resolved = await adminService.resolveDispute(disputeId, resolution);
        const index = this.disputes.findIndex((d) => d.id === disputeId);
        if (index !== -1) {
          this.disputes[index] = resolved;
        }
        return resolved;
      } catch (error) {
        throw error;
      }
    },

    async fetchAnalytics(params = {}) {
      this.loading.analytics = true;
      this.error.analytics = null;
      try {
        this.analytics = await adminService.getAnalytics(params);
      } catch (error) {
        this.error.analytics = error.response?.data?.message || 'Failed to load analytics';
        throw error;
      } finally {
        this.loading.analytics = false;
      }
    },
  },
});
