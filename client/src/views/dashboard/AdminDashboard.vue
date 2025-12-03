<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Users</p>
        <p class="text-3xl font-bold">{{ adminStats?.totalUsers || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p class="text-sm opacity-90 mb-1">Active Products</p>
        <p class="text-3xl font-bold">{{ adminStats?.activeProducts || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Orders</p>
        <p class="text-3xl font-bold">{{ adminStats?.totalOrders || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
        <p class="text-sm opacity-90 mb-1">Platform Revenue</p>
        <p class="text-3xl font-bold">{{ formatCurrency(adminStats?.totalRevenue || 0) }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="flex flex-wrap gap-4">
        <router-link to="/admin/users" class="btn btn-primary">
          Manage Users
        </router-link>
        <router-link to="/admin/products" class="btn btn-secondary">
          Manage Products
        </router-link>
        <router-link to="/admin/disputes" class="btn btn-secondary">
          View Disputes
        </router-link>
        <router-link to="/admin/analytics" class="btn btn-secondary">
          Analytics
        </router-link>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Recent Activity</h2>
      <p class="text-gray-600">Platform activity will appear here...</p>
      <p class="text-sm text-gray-500 mt-2">
        Full admin panel features will be available in Task 28
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { formatCurrency } from '@/utils/helpers';

const dashboardStore = useDashboardStore();
const adminStats = ref(null);

onMounted(async () => {
  try {
    await dashboardStore.fetchAdminDashboard();
    adminStats.value = dashboardStore.adminStats;
  } catch (error) {
    console.error('Failed to load admin dashboard:', error);
  }
});
</script>
