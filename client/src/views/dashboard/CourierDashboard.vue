<template>
  <DashboardLayout title="Courier Dashboard" :sidebar-menu="sidebarMenu">

    <!-- Stats Cards -->
    <div v-if="loading.stats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div v-for="i in 4" :key="i" class="card animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>

    <div v-else-if="courierStats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <p class="text-sm opacity-90 mb-1">Available Deliveries</p>
        <p class="text-3xl font-bold">{{ courierStats.availableDeliveries || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <p class="text-sm opacity-90 mb-1">Active Deliveries</p>
        <p class="text-3xl font-bold">{{ courierStats.activeDeliveries || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p class="text-sm opacity-90 mb-1">Completed</p>
        <p class="text-3xl font-bold">{{ courierStats.completedDeliveries || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Earnings</p>
        <p class="text-3xl font-bold">{{ formatCurrency(courierStats.totalEarnings || 0) }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="flex flex-wrap gap-4">
        <button @click="refreshAvailable" class="btn btn-primary">
          Refresh Available Deliveries
        </button>
        <router-link to="/deliveries/active" class="btn btn-secondary">
          View Active Deliveries
        </router-link>
        <router-link to="/deliveries/history" class="btn btn-secondary">
          Delivery History
        </router-link>
      </div>
    </div>

    <!-- Active Deliveries -->
    <div class="card mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Active Deliveries</h2>
        <span class="badge-primary">{{ myDeliveries.length }} Active</span>
      </div>

      <div v-if="loading.deliveries" class="space-y-4">
        <div v-for="i in 2" :key="i" class="border rounded-lg p-4 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error.deliveries" class="text-center py-8 text-red-600">
        {{ error.deliveries }}
      </div>

      <div v-else-if="myDeliveries.length === 0" class="text-center py-8 text-gray-500">
        <p class="mb-2">You don't have any active deliveries.</p>
        <p class="text-sm">Check available deliveries below to accept new assignments.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="delivery in myDeliveries"
          :key="delivery.id"
          class="border rounded-lg p-4 bg-blue-50 border-blue-200"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-gray-900">
                  Delivery #{{ delivery.id.slice(0, 8) }}
                </h3>
                <span
                  :class="{
                    'badge-warning': delivery.status === 'assigned',
                    'badge-primary': delivery.status === 'picked_up',
                    'badge-success': delivery.status === 'delivered',
                  }"
                >
                  {{ formatDeliveryStatus(delivery.status) }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p class="text-gray-600">Pickup Location:</p>
                  <p class="font-medium">{{ delivery.pickupLocation || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Delivery Location:</p>
                  <p class="font-medium">{{ delivery.deliveryLocation || 'N/A' }}</p>
                </div>
              </div>

              <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-700">
                  Fee: <strong class="text-green-600">{{ formatCurrency(delivery.fee) }}</strong>
                </span>
                <span class="text-gray-600">
                  Order: <strong>#{{ delivery.orderId?.slice(0, 8) }}</strong>
                </span>
              </div>

              <p class="text-xs text-gray-500 mt-2">
                Assigned {{ formatRelativeTime(delivery.assignedAt || delivery.createdAt) }}
              </p>
            </div>

            <div class="ml-4">
              <button
                v-if="delivery.status === 'assigned'"
                @click="handlePickup(delivery.id)"
                class="btn btn-sm btn-primary mb-2 w-full"
              >
                Mark Picked Up
              </button>
              <button
                v-if="delivery.status === 'picked_up'"
                @click="handleDeliver(delivery.id)"
                class="btn btn-sm btn-success mb-2 w-full"
              >
                Mark Delivered
              </button>
              <router-link
                :to="`/deliveries/${delivery.id}`"
                class="btn btn-sm btn-secondary w-full"
              >
                View Details
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Deliveries -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Available Deliveries</h2>
        <span class="badge-success">{{ availableDeliveries.length }} Available</span>
      </div>

      <div v-if="loading.deliveries && availableDeliveries.length === 0" class="space-y-4">
        <div v-for="i in 3" :key="i" class="border rounded-lg p-4 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="availableDeliveries.length === 0" class="text-center py-8 text-gray-500">
        <p class="mb-2">No available deliveries at the moment.</p>
        <p class="text-sm">Check back later for new opportunities.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="delivery in availableDeliveries"
          :key="delivery.id"
          class="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-gray-900">
                  Delivery #{{ delivery.id.slice(0, 8) }}
                </h3>
                <span class="badge-success">Available</span>
              </div>

              <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p class="text-gray-600">Pickup Location:</p>
                  <p class="font-medium">{{ delivery.pickupLocation || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Delivery Location:</p>
                  <p class="font-medium">{{ delivery.deliveryLocation || 'N/A' }}</p>
                </div>
              </div>

              <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-700">
                  Fee: <strong class="text-green-600">{{ formatCurrency(delivery.fee) }}</strong>
                </span>
                <span class="text-gray-600">
                  Distance: <strong>{{ delivery.distance || 'N/A' }}</strong>
                </span>
              </div>

              <p class="text-xs text-gray-500 mt-2">
                Posted {{ formatRelativeTime(delivery.createdAt) }}
              </p>
            </div>

            <div class="ml-4">
              <button
                @click="handleAcceptDelivery(delivery.id)"
                class="btn btn-sm btn-primary"
              >
                Accept Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { formatCurrency, formatRelativeTime } from '@/utils/helpers';
import DashboardLayout from '@/components/DashboardLayout.vue';
import { ChartBarIcon, ClipboardIcon, TruckIcon, ClockIcon, ChatBubbleLeftIcon } from '@heroicons/vue/24/outline';

const dashboardStore = useDashboardStore();

const sidebarMenu = [
  { path: '/dashboard', label: 'Overview', icon: ChartBarIcon },
  { path: '/deliveries', label: 'Available', icon: ClipboardIcon },
  { path: '/deliveries/active', label: 'Active Deliveries', icon: TruckIcon },
  { path: '/deliveries/history', label: 'History', icon: ClockIcon },
  { path: '/chat', label: 'Messages', icon: ChatBubbleLeftIcon },
];

const courierStats = computed(() => dashboardStore.courierStats);
const availableDeliveries = computed(() => dashboardStore.availableDeliveries);
const myDeliveries = computed(() => dashboardStore.myDeliveries);
const loading = computed(() => dashboardStore.loading);
const error = computed(() => dashboardStore.error);

const formatDeliveryStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    assigned: 'Assigned',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
  };
  return statusMap[status] || status;
};

const refreshAvailable = async () => {
  try {
    await dashboardStore.fetchAvailableDeliveries();
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to refresh deliveries');
  }
};

const handleAcceptDelivery = async (deliveryId) => {
  if (!confirm('Accept this delivery?')) return;

  try {
    await dashboardStore.acceptDelivery(deliveryId);
    alert('Delivery accepted! Check your active deliveries.');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to accept delivery');
  }
};

const handlePickup = async (deliveryId) => {
  if (!confirm('Mark this delivery as picked up?')) return;

  try {
    await dashboardStore.updateDeliveryStatus(deliveryId, 'picked_up');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to update status');
  }
};

const handleDeliver = async (deliveryId) => {
  if (!confirm('Mark this delivery as delivered?')) return;

  try {
    await dashboardStore.updateDeliveryStatus(deliveryId, 'delivered');
    alert('Delivery marked as delivered!');
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to update status');
  }
};

onMounted(async () => {
  try {
    await dashboardStore.fetchCourierDashboard();
  } catch (error) {
    console.error('Failed to load courier dashboard:', error);
  }
});
</script>
