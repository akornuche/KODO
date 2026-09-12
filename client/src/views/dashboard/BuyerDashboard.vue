<template>
  <DashboardLayout title="Buyer Dashboard" :sidebar-menu="sidebarMenu">

    <!-- Stats Cards -->
    <div v-if="loading.stats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div v-for="i in 4" :key="i" class="card animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>

    <div v-else-if="buyerStats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <p class="text-sm opacity-90 mb-1">Active Bids</p>
        <p class="text-3xl font-bold">{{ buyerStats.activeBids || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p class="text-sm opacity-90 mb-1">Orders</p>
        <p class="text-3xl font-bold">{{ buyerStats.totalOrders || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <p class="text-sm opacity-90 mb-1">Pending Orders</p>
        <p class="text-3xl font-bold">{{ buyerStats.pendingOrders || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Spent</p>
        <p class="text-3xl font-bold">{{ formatCurrency(buyerStats.totalSpent || 0) }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="flex flex-wrap gap-4">
        <router-link to="/products" class="btn btn-primary">
          Browse Products
        </router-link>
        <router-link to="/requests" class="btn btn-secondary">
          View Requests
        </router-link>
        <router-link to="/orders" class="btn btn-secondary">
          View Orders
        </router-link>
        <router-link to="/chat" class="btn btn-secondary">
          Messages
        </router-link>
      </div>
    </div>

    <!-- Active Bids -->
    <div class="card mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Active Bids</h2>
        <router-link to="/requests/create" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
          Create New Request →
        </router-link>
      </div>

      <div v-if="loading.bids" class="space-y-4">
        <div v-for="i in 3" :key="i" class="border rounded-lg p-4 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error.bids" class="text-center py-8 text-red-600">
        {{ error.bids }}
      </div>

      <div v-else-if="myBids.length === 0" class="text-center py-8 text-gray-500">
        <p class="mb-4">You don't have any active bids yet.</p>
        <router-link to="/requests/create" class="btn btn-primary">
          Post Your First Request
        </router-link>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="bid in myBids.slice(0, 5)"
          :key="bid.id"
          class="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 mb-1">{{ bid.product?.title || 'Product' }}</h3>
              <p class="text-sm text-gray-600 mb-2">{{ bid.description }}</p>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-700">
                  Budget: <strong>{{ formatCurrency(bid.budget) }}</strong>
                </span>
                <span
                  :class="{
                    'badge-warning': bid.status === 'pending',
                    'badge-success': bid.status === 'accepted',
                    'badge-danger': bid.status === 'rejected',
                    'badge-primary': bid.status === 'offer_received',
                  }"
                >
                  {{ formatBidStatus(bid.status) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Created {{ formatRelativeTime(bid.createdAt) }}
              </p>
            </div>

            <div v-if="bid.status === 'offer_received' && bid.offerPrice" class="ml-4 text-right">
              <p class="text-sm text-gray-600 mb-2">Seller Offer:</p>
              <p class="text-xl font-bold text-green-600 mb-2">
                {{ formatCurrency(bid.offerPrice) }}
              </p>
              <div class="flex gap-2">
                <button
                  @click="handleAcceptOffer(bid.id)"
                  class="btn btn-sm btn-success"
                >
                  Accept
                </button>
                <button
                  @click="handleRejectOffer(bid.id)"
                  class="btn btn-sm btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Recent Orders</h2>
        <router-link to="/orders" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View All Orders →
        </router-link>
      </div>

      <div v-if="loading.orders" class="space-y-4">
        <div v-for="i in 3" :key="i" class="border rounded-lg p-4 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error.orders" class="text-center py-8 text-red-600">
        {{ error.orders }}
      </div>

      <div v-else-if="myOrders.length === 0" class="text-center py-8 text-gray-500">
        <p>No orders yet.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in myOrders.slice(0, 5)"
              :key="order.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="py-3 px-4 text-sm font-mono text-gray-600">
                #{{ order.id.slice(0, 8) }}
              </td>
              <td class="py-3 px-4">
                <div class="font-medium text-gray-900">{{ order.product?.title || 'Product' }}</div>
              </td>
              <td class="py-3 px-4 font-semibold">
                {{ formatCurrency(order.totalAmount) }}
              </td>
              <td class="py-3 px-4">
                <span
                  :class="{
                    'badge-warning': order.status === 'pending',
                    'badge-success': order.status === 'paid',
                    'badge-primary': order.status === 'shipped',
                    'badge-success': order.status === 'delivered',
                    'badge-danger': order.status === 'cancelled',
                  }"
                >
                  {{ order.status }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="py-3 px-4">
                <router-link
                  :to="`/orders/${order.id}`"
                  class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { useAuthStore } from '@/stores/auth';
import { formatCurrency, formatRelativeTime, formatBidStatus } from '@/utils/helpers';
import DashboardLayout from '@/components/DashboardLayout.vue';
import { ChartBarIcon, MagnifyingGlassIcon, CubeIcon, HeartIcon, ChatBubbleLeftIcon } from '@heroicons/vue/24/outline';

const dashboardStore = useDashboardStore();

const buyerStats = computed(() => dashboardStore.buyerStats);
const myBids = computed(() => dashboardStore.myBids);
const myOrders = computed(() => dashboardStore.myOrders);
const loading = computed(() => dashboardStore.loading);
const error = computed(() => dashboardStore.error);

const handleAcceptOffer = async (bidId) => {
  if (!confirm('Accept this offer? This will create an order.')) return;

  try {
    await dashboardStore.acceptOffer(bidId);
    alert('Offer accepted! Redirecting to payment...');
    // Refresh orders
    await dashboardStore.fetchMyOrders();
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to accept offer');
  }
};

const handleRejectOffer = async (bidId) => {
  if (!confirm('Reject this offer?')) return;

  try {
    await dashboardStore.rejectOffer(bidId);
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to reject offer');
  }
};

const sidebarMenu = [
  { path: '/dashboard', label: 'Overview', icon: ChartBarIcon },
  { path: '/requests', label: 'My Requests', icon: MagnifyingGlassIcon },
  { path: '/orders', label: 'My Orders', icon: CubeIcon },
  { path: '/wishlist', label: 'Wishlist', icon: HeartIcon },
  { path: '/chat', label: 'Messages', icon: ChatBubbleLeftIcon },
];

onMounted(async () => {
  try {
    await dashboardStore.fetchBuyerDashboard();
  } catch (error) {
    console.error('Failed to load buyer dashboard:', error);
  }
});
</script>
