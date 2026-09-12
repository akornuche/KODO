<template>
  <DashboardLayout title="Admin Dashboard" :sidebar-menu="sidebarMenu">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Users</p>
        <p class="text-3xl font-bold">{{ adminStats?.overview?.totalUsers || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p class="text-sm opacity-90 mb-1">Active Products</p>
        <p class="text-3xl font-bold">{{ adminStats?.overview?.totalProducts || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Orders</p>
        <p class="text-3xl font-bold">{{ adminStats?.overview?.totalOrders || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
        <p class="text-sm opacity-90 mb-1">Platform Revenue</p>
        <p class="text-3xl font-bold">{{ formatCurrency(adminStats?.overview?.totalRevenue || 0) }}</p>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Users by Role</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Admins</span>
            <span class="text-lg font-bold">{{ adminStats?.users?.byRole?.admin || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Sellers</span>
            <span class="text-lg font-bold">{{ adminStats?.users?.byRole?.seller || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Buyers</span>
            <span class="text-lg font-bold">{{ adminStats?.users?.byRole?.buyer || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Couriers</span>
            <span class="text-lg font-bold">{{ adminStats?.users?.byRole?.courier || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Platform Stats</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Total Bids</span>
            <span class="text-lg font-bold">{{ adminStats?.overview?.totalBids || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Total Deliveries</span>
            <span class="text-lg font-bold">{{ adminStats?.overview?.totalDeliveries || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-700">Revenue</span>
            <span class="text-lg font-bold">{{ formatCurrency(adminStats?.overview?.totalRevenue || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Recent Activity</h2>
      <p class="text-gray-600">Platform activity monitoring will be available soon...</p>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { formatCurrency } from '@/utils/helpers';
import DashboardLayout from '@/components/DashboardLayout.vue';
import { UserGroupIcon, CubeIcon, ScaleIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline';

const dashboardStore = useDashboardStore();
const adminStats = ref(null);

const sidebarMenu = [
  { path: '/admin/users', label: 'Manage Users', icon: UserGroupIcon },
  { path: '/admin/products', label: 'Manage Products', icon: CubeIcon },
  { path: '/admin/disputes', label: 'View Disputes', icon: ScaleIcon },
  { path: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
  { path: '/admin/settings', label: 'Settings', icon: Cog6ToothIcon },
];

onMounted(async () => {
  try {
    await dashboardStore.fetchAdminDashboard();
    adminStats.value = dashboardStore.adminStats;
  } catch (error) {
    console.error('Failed to load admin dashboard:', error);
  }
});
</script>
