<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Deliveries</h1>

    <!-- Tabs -->
    <div class="mb-6 border-b">
      <nav class="flex gap-6">
        <button
          @click="activeTab = 'available'"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors',
            activeTab === 'available'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Available Deliveries
          <span v-if="availableDeliveries.length > 0" class="ml-2 badge-primary">
            {{ availableDeliveries.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'active'"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors',
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          My Active Deliveries
          <span v-if="myDeliveries.length > 0" class="ml-2 badge-warning">
            {{ myDeliveries.length }}
          </span>
        </button>
        <button
          @click="activeTab = 'history'"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors',
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          History
        </button>
      </nav>
    </div>

    <!-- Available Deliveries Tab -->
    <div v-if="activeTab === 'available'">
      <div class="mb-6 flex justify-between items-center">
        <p class="text-gray-600">
          {{ availableDeliveries.length }} available deliveries
        </p>
        <button @click="fetchAvailableDeliveries" class="btn btn-sm btn-secondary">
          Refresh
        </button>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error" class="card text-center text-red-600">
        {{ error }}
      </div>

      <div v-else-if="availableDeliveries.length === 0" class="card text-center py-12">
        <p class="text-gray-600 mb-2">No available deliveries at the moment.</p>
        <p class="text-sm text-gray-500">Check back later for new opportunities.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="delivery in availableDeliveries"
          :key="delivery.id"
          class="card hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                Delivery #{{ delivery.id.slice(0, 8) }}
              </h3>
              <span class="badge-success">Available</span>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-600 mb-1">Delivery Fee</p>
              <p class="text-2xl font-bold text-green-600">{{ formatCurrency(delivery.fee) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="p-3 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-900 font-medium mb-1">📍 Pickup</p>
              <p class="text-blue-700">{{ delivery.pickupLocation || 'Not specified' }}</p>
            </div>
            <div class="p-3 bg-green-50 rounded-lg">
              <p class="text-sm text-green-900 font-medium mb-1">📍 Delivery</p>
              <p class="text-green-700">{{ delivery.deliveryLocation || 'Not specified' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span v-if="delivery.distance">
              <strong>Distance:</strong> {{ delivery.distance }}
            </span>
            <span v-if="delivery.estimatedDeliveryTime">
              <strong>Est. Time:</strong> {{ delivery.estimatedDeliveryTime }}
            </span>
            <span>
              <strong>Posted:</strong> {{ formatRelativeTime(delivery.createdAt) }}
            </span>
          </div>

          <div class="flex gap-3 border-t pt-4">
            <button
              @click="handleAcceptDelivery(delivery.id)"
              class="btn btn-primary flex-1"
            >
              Accept Delivery
            </button>
            <router-link
              :to="`/deliveries/${delivery.id}`"
              class="btn btn-secondary"
            >
              View Details
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Deliveries Tab -->
    <div v-if="activeTab === 'active'">
      <div class="mb-6">
        <p class="text-gray-600">
          {{ myDeliveries.length }} active deliveries
        </p>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 2" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="error" class="card text-center text-red-600">
        {{ error }}
      </div>

      <div v-else-if="myDeliveries.length === 0" class="card text-center py-12">
        <p class="text-gray-600 mb-2">You don't have any active deliveries.</p>
        <p class="text-sm text-gray-500">Check the Available tab to accept new deliveries.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="delivery in myDeliveries"
          :key="delivery.id"
          class="card bg-blue-50 border-blue-200 hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                Delivery #{{ delivery.id.slice(0, 8) }}
              </h3>
              <span
                :class="{
                  'badge-warning': delivery.status === 'assigned',
                  'badge-primary': delivery.status === 'picked_up',
                  'badge-primary': delivery.status === 'in_transit',
                }"
              >
                {{ formatDeliveryStatus(delivery.status) }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-600 mb-1">Earning</p>
              <p class="text-2xl font-bold text-green-600">{{ formatCurrency(delivery.fee) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="p-3 bg-white rounded-lg">
              <p class="text-sm text-gray-700 font-medium mb-1">📍 Pickup</p>
              <p class="text-gray-900">{{ delivery.pickupLocation || 'Not specified' }}</p>
            </div>
            <div class="p-3 bg-white rounded-lg">
              <p class="text-sm text-gray-700 font-medium mb-1">📍 Delivery</p>
              <p class="text-gray-900">{{ delivery.deliveryLocation || 'Not specified' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-700 mb-4">
            <span>
              <strong>Order:</strong> #{{ delivery.orderId?.slice(0, 8) }}
            </span>
            <span>
              <strong>Assigned:</strong> {{ formatRelativeTime(delivery.assignedAt || delivery.createdAt) }}
            </span>
          </div>

          <div class="flex gap-3 border-t pt-4">
            <router-link
              :to="`/deliveries/${delivery.id}`"
              class="btn btn-primary flex-1"
            >
              Track & Update
            </router-link>
            <button
              v-if="delivery.status === 'assigned'"
              @click="handleQuickUpdate(delivery.id, 'picked_up')"
              class="btn btn-success"
            >
              Mark Picked Up
            </button>
            <button
              v-if="delivery.status === 'picked_up' || delivery.status === 'in_transit'"
              @click="handleQuickUpdate(delivery.id, 'delivered')"
              class="btn btn-success"
            >
              Mark Delivered
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- History Tab -->
    <div v-if="activeTab === 'history'">
      <div class="mb-6">
        <p class="text-gray-600">Your completed and cancelled deliveries</p>
      </div>

      <div class="card text-center py-12">
        <p class="text-gray-600">Delivery history coming soon...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import { formatCurrency, formatRelativeTime } from '@/utils/helpers';

const router = useRouter();
const dashboardStore = useDashboardStore();

const activeTab = ref('available');
const loading = computed(() => dashboardStore.loading.deliveries);
const error = computed(() => dashboardStore.error.deliveries);
const availableDeliveries = computed(() => dashboardStore.availableDeliveries);
const myDeliveries = computed(() => dashboardStore.myDeliveries);

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

const fetchAvailableDeliveries = async () => {
  try {
    await dashboardStore.fetchAvailableDeliveries();
  } catch (err) {
    console.error('Failed to fetch available deliveries:', err);
  }
};

const handleAcceptDelivery = async (deliveryId) => {
  if (!confirm('Accept this delivery?')) return;

  try {
    await dashboardStore.acceptDelivery(deliveryId);
    activeTab.value = 'active';
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to accept delivery');
  }
};

const handleQuickUpdate = async (deliveryId, status) => {
  const messages = {
    picked_up: 'Mark as picked up?',
    delivered: 'Confirm delivery?',
  };

  if (!confirm(messages[status])) return;

  try {
    await dashboardStore.updateDeliveryStatus(deliveryId, status);
    if (status === 'delivered') {
      alert('Delivery completed! Great work! 🎉');
    }
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update status');
  }
};

onMounted(async () => {
  try {
    await Promise.all([
      dashboardStore.fetchAvailableDeliveries(),
      dashboardStore.fetchMyDeliveries(),
    ]);
  } catch (err) {
    console.error('Failed to load deliveries:', err);
  }
});
</script>
