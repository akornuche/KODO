import { defineStore } from 'pinia';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isBuyer: (state) => state.user?.role === 'buyer',
    isSeller: (state) => state.user?.role === 'seller',
    isCourier: (state) => state.user?.role === 'courier',
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    async register(userData) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/api/auth/register', userData);
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Connect Socket.IO
        connectSocket(token);

        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.message || error.response?.data?.error || 'Registration failed';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async login(credentials) {
      this.loading = true;
      this.error = null;

      try {
        const response = await api.post('/api/auth/login', credentials);
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Connect Socket.IO
        connectSocket(token);

        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.message || error.response?.data?.error || 'Login failed';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile() {
      try {
        const response = await api.get('/api/auth/profile');
        const user = response.data.user || response.data;
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch profile';
        return { success: false };
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.error = null;

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Disconnect Socket.IO
      disconnectSocket();
    },

    clearError() {
      this.error = null;
    },
  },
});
