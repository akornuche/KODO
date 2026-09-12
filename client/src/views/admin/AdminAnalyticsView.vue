<template>
  <div>
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Analytics</h1>
      <p class="text-gray-600 mt-2">Platform performance and activity metrics</p>
    </div>

    <!-- Period Selector -->
    <div class="card mb-6">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="period in ['7d', '30d', '90d', '1y']"
          :key="period"
          @click="selectedPeriod = period; fetchAnalytics()"
          :class="['btn', selectedPeriod === period ? 'btn-primary' : 'btn-secondary']"
        >
          {{ periodLabels[period] }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="mt-4 text-gray-600">Loading analytics...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-red-50 border border-red-200 text-red-700 py-4 px-6">
      {{ error }}
    </div>

    <!-- Analytics Content -->
    <div v-else class="space-y-6">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="card">
          <p class="text-sm text-gray-600 mb-2">Total Revenue</p>
          <p class="text-3xl font-bold text-gray-900">₦{{ formatCurrency(analytics.overview?.totalRevenue || 0) }}</p>
          <p class="text-xs text-gray-500 mt-2">{{ analytics.overview?.period }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-600 mb-2">Total Orders</p>
          <p class="text-3xl font-bold text-gray-900">{{ analytics.overview?.totalOrders || 0 }}</p>
          <p class="text-xs text-gray-500 mt-2">Completed transactions</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-600 mb-2">Active Users</p>
          <p class="text-3xl font-bold text-gray-900">{{ analytics.overview?.activeUsers || 0 }}</p>
          <p class="text-xs text-gray-500 mt-2">With activity this period</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-600 mb-2">New Users</p>
          <p class="text-3xl font-bold text-gray-900">{{ analytics.overview?.newUsersThisMonth || 0 }}</p>
          <p class="text-xs text-gray-500 mt-2">This month</p>
        </div>
      </div>

      <!-- Orders Breakdown -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Orders by Status</h3>
          <div class="space-y-3">
            <div v-for="(value, status) in analytics.orders?.byStatus" :key="status" class="flex items-center justify-between">
              <span class="text-sm text-gray-700 capitalize">{{ status }}</span>
              <span class="font-semibold">{{ value }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Deliveries by Status</h3>
          <div class="space-y-3">
            <div v-for="(value, status) in analytics.deliveries?.byStatus" :key="status" class="flex items-center justify-between">
              <span class="text-sm text-gray-700 capitalize">{{ status }}</span>
              <span class="font-semibold">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- User Demographics -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">User Demographics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600">Total Users</p>
            <p class="text-2xl font-bold text-gray-900">{{ analytics.users?.totalUsers || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600">Buyers</p>
            <p class="text-2xl font-bold text-blue-600">{{ analytics.users?.byRole?.buyer || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600">Sellers</p>
            <p class="text-2xl font-bold text-green-600">{{ analytics.users?.byRole?.seller || 0 }}</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600">Couriers</p>
            <p class="text-2xl font-bold text-purple-600">{{ analytics.users?.byRole?.courier || 0 }}</p>
          </div>
        </div>
      </div>

      <!-- Top Sellers -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Top Sellers by Orders</h3>
        <div v-if="analytics.topSellers?.length > 0" class="space-y-2">
          <div v-for="seller in analytics.topSellers" :key="seller.id" class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span class="text-sm font-medium">{{ seller.username }}</span>
            <span class="badge badge-green">{{ seller.orderCount }} orders</span>
          </div>
        </div>
        <p v-else class="text-gray-500 text-sm">No seller data available</p>
      </div>

      <!-- Top Buyers -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Top Buyers by Orders</h3>
        <div v-if="analytics.topBuyers?.length > 0" class="space-y-2">
          <div v-for="buyer in analytics.topBuyers" :key="buyer.id" class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span class="text-sm font-medium">{{ buyer.username }}</span>
            <span class="badge badge-blue">{{ buyer.orderCount }} orders</span>
          </div>
        </div>
        <p v-else class="text-gray-500 text-sm">No buyer data available</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { formatCurrency } from '@/utils/helpers';
import api from '@/services/api';

const analytics = ref({});
const loading = ref(false);
const error = ref(null);
const selectedPeriod = ref('30d');

const periodLabels = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  '1y': 'Last Year',
};

const fetchAnalytics = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.get(`/admin/analytics?period=${selectedPeriod.value}`);
    analytics.value = response.data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load analytics';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAnalytics);
</script>
