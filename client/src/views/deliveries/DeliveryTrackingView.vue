<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- Back Button -->
    <button @click="$router.back()" class="mb-6 text-primary-600 hover:text-primary-700 flex items-center gap-2">
      ← Back
    </button>

    <!-- Loading State -->
    <div v-if="loading" class="card animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-96 bg-gray-200 rounded"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card text-center text-red-600">
      {{ error }}
    </div>

    <!-- Delivery Details -->
    <div v-else-if="delivery">
      <!-- Header -->
      <div class="card mb-6">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              Delivery Tracking
            </h1>
            <p class="text-sm text-gray-600">
              Tracking #{{ delivery.trackingNumber || delivery.id.slice(0, 12) }}
            </p>
          </div>
          <span
            :class="{
              'badge-warning': delivery.status === 'pending',
              'badge-primary': delivery.status === 'assigned',
              'badge-primary': delivery.status === 'picked_up',
              'badge-primary': delivery.status === 'in_transit',
              'badge-success': delivery.status === 'delivered',
              'badge-danger': delivery.status === 'cancelled',
            }"
            class="text-lg"
          >
            {{ formatDeliveryStatus(delivery.status) }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Map -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Live Tracking</h2>
            <div ref="mapContainer" class="rounded-lg overflow-hidden" style="height: 400px;"></div>
            <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div class="p-3 bg-blue-50 rounded-lg">
                <p class="text-blue-900 font-medium mb-1">📍 Pickup Location</p>
                <p class="text-blue-700">{{ delivery.pickupLocation || 'Not specified' }}</p>
              </div>
              <div class="p-3 bg-green-50 rounded-lg">
                <p class="text-green-900 font-medium mb-1">📍 Delivery Location</p>
                <p class="text-green-700">{{ delivery.deliveryLocation || 'Not specified' }}</p>
              </div>
            </div>
          </div>

          <!-- Status Timeline -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Delivery Timeline</h2>
            <div class="relative">
              <div class="absolute left-0 top-2 bottom-2 w-1 bg-gray-200"></div>
              <div
                class="absolute left-0 top-2 w-1 bg-primary-600 transition-all"
                :style="{ height: getTimelineProgress() }"
              ></div>

              <div class="space-y-6 relative">
                <div
                  v-for="step in deliverySteps"
                  :key="step.status"
                  class="flex items-start gap-4 relative"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded-full flex-shrink-0 z-10 mt-0.5',
                      step.completed ? 'bg-primary-600' : 'bg-gray-300'
                    ]"
                  ></div>
                  <div class="flex-1">
                    <p :class="['font-medium', step.completed ? 'text-gray-900' : 'text-gray-500']">
                      {{ step.label }}
                    </p>
                    <p v-if="step.timestamp" class="text-sm text-gray-600">
                      {{ formatDate(step.timestamp) }}
                    </p>
                    <p v-if="step.description" class="text-sm text-gray-600 mt-1">
                      {{ step.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Information -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Order Information</h2>
            <div v-if="delivery.order" class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">Order ID:</span>
                <router-link
                  :to="`/orders/${delivery.orderId}`"
                  class="text-primary-600 hover:text-primary-700 font-medium"
                >
                  #{{ delivery.orderId.slice(0, 8) }}
                </router-link>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Product:</span>
                <span class="font-medium">{{ delivery.order.product?.title || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Buyer:</span>
                <span class="font-medium">{{ delivery.order.buyer?.username || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Seller:</span>
                <span class="font-medium">{{ delivery.order.seller?.username || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Courier Info -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Courier Information</h2>
            <div v-if="delivery.courier" class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                  {{ delivery.courier.username?.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ delivery.courier.username }}</p>
                  <p class="text-sm text-gray-600">{{ delivery.courier.email }}</p>
                </div>
              </div>
              <div v-if="delivery.courier.phone" class="pt-3 border-t">
                <p class="text-sm text-gray-600 mb-1">Phone:</p>
                <p class="font-medium">{{ delivery.courier.phone }}</p>
              </div>
              <router-link
                :to="`/chat?user=${delivery.courierId}`"
                class="btn btn-primary w-full mt-3"
              >
                Message Courier
              </router-link>
            </div>
            <div v-else class="text-gray-500 text-center py-4">
              <p>No courier assigned yet</p>
            </div>
          </div>

          <!-- Delivery Details -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Details</h2>
            <div class="space-y-3 text-sm">
              <div>
                <p class="text-gray-600">Delivery Fee:</p>
                <p class="font-semibold text-lg text-green-600">{{ formatCurrency(delivery.fee) }}</p>
              </div>
              <div>
                <p class="text-gray-600">Distance:</p>
                <p class="font-medium">{{ delivery.distance || 'Calculating...' }}</p>
              </div>
              <div>
                <p class="text-gray-600">Estimated Time:</p>
                <p class="font-medium">{{ delivery.estimatedDeliveryTime || 'TBD' }}</p>
              </div>
              <div v-if="delivery.notes">
                <p class="text-gray-600">Special Instructions:</p>
                <p class="text-gray-900">{{ delivery.notes }}</p>
              </div>
            </div>
          </div>

          <!-- Courier Actions (for courier role only) -->
          <div v-if="isCourier && delivery.courierId === userId" class="card">
            <h2 class="text-xl font-semibold mb-4">Actions</h2>
            <div class="space-y-3">
              <button
                v-if="delivery.status === 'assigned'"
                @click="updateStatus('picked_up')"
                class="btn btn-primary w-full"
              >
                Mark as Picked Up
              </button>
              <button
                v-if="delivery.status === 'picked_up'"
                @click="updateStatus('in_transit')"
                class="btn btn-primary w-full"
              >
                Start Transit
              </button>
              <button
                v-if="['picked_up', 'in_transit'].includes(delivery.status)"
                @click="updateStatus('delivered')"
                class="btn btn-success w-full"
              >
                Mark as Delivered
              </button>
              <button
                v-if="['assigned', 'picked_up', 'in_transit'].includes(delivery.status)"
                @click="showLocationModal = true"
                class="btn btn-secondary w-full"
              >
                Update Location
              </button>
            </div>
          </div>

          <!-- Live Updates -->
          <div class="card bg-blue-50 border-blue-200">
            <div class="flex items-center gap-2 text-blue-700 mb-2">
              <span class="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
              <span class="font-medium">Live Updates</span>
            </div>
            <p class="text-sm text-blue-700">
              This page updates automatically when the courier changes status or location.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Location Modal -->
    <div
      v-if="showLocationModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Update Location</h3>

        <form @submit.prevent="handleUpdateLocation">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Latitude *
            </label>
            <input
              v-model.number="locationForm.lat"
              type="number"
              step="0.000001"
              required
              class="input"
              placeholder="e.g., 40.7128"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Longitude *
            </label>
            <input
              v-model.number="locationForm.lng"
              type="number"
              step="0.000001"
              required
              class="input"
              placeholder="e.g., -74.0060"
            />
          </div>

          <div class="mb-4">
            <button
              type="button"
              @click="getCurrentLocation"
              :disabled="locationForm.loadingGPS"
              class="btn btn-outline-primary w-full"
            >
              {{ locationForm.loadingGPS ? 'Getting Location...' : '📍 Use Current Location' }}
            </button>
          </div>

          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-xs text-blue-700">
              💡 Click "Use Current Location" to automatically fill coordinates using your device's GPS.
            </p>
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              class="btn btn-primary flex-1"
              :disabled="updatingLocation"
            >
              {{ updatingLocation ? 'Updating...' : 'Update Location' }}
            </button>
            <button
              type="button"
              @click="showLocationModal = false"
              class="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { deliveryService } from '@/services/dashboardService';
import { getSocket, onEvent, offEvent } from '@/services/socket';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/helpers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const route = useRoute();
const authStore = useAuthStore();

const delivery = ref(null);
const loading = ref(false);
const error = ref(null);
const showLocationModal = ref(false);
const updatingLocation = ref(false);
const mapContainer = ref(null);
const map = ref(null);
const markers = ref([]);

const locationForm = reactive({
  lat: null,
  lng: null,
  loadingGPS: false,
});

const userId = computed(() => authStore.user?.id);
const isCourier = computed(() => authStore.user?.role === 'courier');

const deliverySteps = computed(() => {
  if (!delivery.value) return [];

  return [
    {
      status: 'pending',
      label: 'Order Ready for Pickup',
      completed: true,
      timestamp: delivery.value.createdAt,
      description: 'Delivery created and waiting for courier assignment',
    },
    {
      status: 'assigned',
      label: 'Courier Assigned',
      completed: ['assigned', 'picked_up', 'in_transit', 'delivered'].includes(delivery.value.status),
      timestamp: delivery.value.assignedAt,
      description: delivery.value.courier ? `Assigned to ${delivery.value.courier.username}` : null,
    },
    {
      status: 'picked_up',
      label: 'Package Picked Up',
      completed: ['picked_up', 'in_transit', 'delivered'].includes(delivery.value.status),
      timestamp: delivery.value.pickedUpAt,
      description: 'Courier has collected the package from seller',
    },
    {
      status: 'in_transit',
      label: 'In Transit',
      completed: ['in_transit', 'delivered'].includes(delivery.value.status),
      timestamp: delivery.value.inTransitAt,
      description: 'Package is on the way to delivery location',
    },
    {
      status: 'delivered',
      label: 'Delivered',
      completed: delivery.value.status === 'delivered',
      timestamp: delivery.value.deliveredAt,
      description: 'Package successfully delivered to buyer',
    },
  ];
});

const formatDeliveryStatus = (status) => {
  const statusMap = {
    pending: 'Pending',
    assigned: 'Assigned',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
};

const getTimelineProgress = () => {
  const completedSteps = deliverySteps.value.filter(s => s.completed).length;
  const totalSteps = deliverySteps.value.length;
  return `${((completedSteps - 1) / (totalSteps - 1)) * 100}%`;
};

const fetchDelivery = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await deliveryService.getDeliveryTracking(route.params.id);
    delivery.value = data;
    updateMapMarkers();
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load delivery tracking';
  } finally {
    loading.value = false;
  }
};

const updateStatus = async (newStatus) => {
  const confirmMessages = {
    picked_up: 'Confirm that you have picked up the package?',
    in_transit: 'Start transit to delivery location?',
    delivered: 'Confirm that the package has been delivered?',
  };

  if (!confirm(confirmMessages[newStatus])) return;

  try {
    await deliveryService.updateDeliveryStatus(delivery.value.id, newStatus);
    await fetchDelivery();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update status');
  }
};

const handleUpdateLocation = async () => {
  if (!locationForm.lat || !locationForm.lng) {
    alert('Please enter both latitude and longitude');
    return;
  }

  updatingLocation.value = true;

  try {
    await deliveryService.updateLocation(delivery.value.id, {
      lat: locationForm.lat,
      lng: locationForm.lng,
    });

    showLocationModal.value = false;
    locationForm.lat = null;
    locationForm.lng = null;
    await fetchDelivery();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update location');
  } finally {
    updatingLocation.value = false;
  }
};

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by this browser');
    return;
  }

  locationForm.loadingGPS = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locationForm.lat = position.coords.latitude;
      locationForm.lng = position.coords.longitude;
      locationForm.loadingGPS = false;
    },
    (error) => {
      console.error('Error getting location:', error);
      let errorMessage = 'Unable to get your location';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
      }

      alert(errorMessage);
      locationForm.loadingGPS = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    }
  );
};

// Real-time updates via Socket.IO
const setupRealtimeUpdates = () => {
  const socket = getSocket();
  if (!socket || !delivery.value) return;

  // Subscribe to delivery updates
  socket.emit('delivery:subscribe', { deliveryId: delivery.value.id });

  // Listen for status updates
  onEvent('delivery:statusUpdated', (data) => {
    if (data.deliveryId === delivery.value.id) {
      delivery.value.status = data.status;
      if (data.timestamp) {
        const timestampField = `${data.status}At`;
        delivery.value[timestampField] = data.timestamp;
      }
    }
  });

  // Listen for location updates
  onEvent('delivery:locationUpdated', (data) => {
    if (data.deliveryId === delivery.value.id) {
      delivery.value.currentLat = data.location.lat;
      delivery.value.currentLng = data.location.lng;
      delivery.value.locationUpdatedAt = data.timestamp;
      updateCourierMarker({ lat: data.location.lat, lng: data.location.lng });
    }
  });
};

const cleanupRealtimeUpdates = () => {
  const socket = getSocket();
  if (!socket || !delivery.value) return;

  socket.emit('delivery:unsubscribe', { deliveryId: delivery.value.id });
  offEvent('delivery:statusUpdated');
  offEvent('delivery:locationUpdated');
};

// Map initialization
const initializeMap = () => {
  if (!mapContainer.value) return;

  // Use a default Mapbox access token (in production, this should be from environment variables)
  mapboxgl.accessToken = 'pk.eyJ1IjoiYWtvcm51Y2hlIiwiYSI6ImNtM3p5ZG5zZjAxbG0yanF1dWF5dWF5ZG4ifQ.example_token_replace_with_real';

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [0, 0], // Default center, will be updated with delivery locations
    zoom: 10,
  });

  map.value.on('load', () => {
    updateMapMarkers();
  });
};

const updateMapMarkers = () => {
  if (!map.value || !delivery.value) return;

  // Clear existing markers
  markers.value.forEach(marker => marker.remove());
  markers.value = [];

  const bounds = new mapboxgl.LngLatBounds();

  // Add pickup location marker
  if (delivery.value.pickupLat && delivery.value.pickupLng) {
    const pickupMarker = new mapboxgl.Marker({ color: '#3B82F6' })
      .setLngLat([delivery.value.pickupLng, delivery.value.pickupLat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Pickup Location</strong>'))
      .addTo(map.value);
    markers.value.push(pickupMarker);
    bounds.extend([delivery.value.pickupLng, delivery.value.pickupLat]);
  }

  // Add delivery location marker
  if (delivery.value.dropoffLat && delivery.value.dropoffLng) {
    const deliveryMarker = new mapboxgl.Marker({ color: '#10B981' })
      .setLngLat([delivery.value.dropoffLng, delivery.value.dropoffLat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Delivery Location</strong>'))
      .addTo(map.value);
    markers.value.push(deliveryMarker);
    bounds.extend([delivery.value.dropoffLng, delivery.value.dropoffLat]);
  }

  // Add courier location marker
  if (delivery.value.currentLat && delivery.value.currentLng) {
    updateCourierMarker({ lat: delivery.value.currentLat, lng: delivery.value.currentLng });
  }

  // Fit map to show all markers
  if (!bounds.isEmpty()) {
    map.value.fitBounds(bounds, { padding: 50 });
  }
};

const updateCourierMarker = (location) => {
  if (!map.value || !location) return;

  // Remove existing courier marker
  const existingCourierMarker = markers.value.find(marker => marker.courierMarker);
  if (existingCourierMarker) {
    existingCourierMarker.remove();
    markers.value = markers.value.filter(marker => !marker.courierMarker);
  }

  // Add new courier marker
  const courierMarker = new mapboxgl.Marker({ color: '#F59E0B' })
    .setLngLat([location.lng, location.lat])
    .setPopup(new mapboxgl.Popup().setHTML('<strong>Courier Location</strong><br/>Last updated: ' + formatRelativeTime(delivery.value.locationUpdatedAt)))
    .addTo(map.value);

  courierMarker.courierMarker = true;
  markers.value.push(courierMarker);
};

onMounted(async () => {
  await fetchDelivery();
  initializeMap();
  setupRealtimeUpdates();
});

onUnmounted(() => {
  cleanupRealtimeUpdates();
  if (map.value) {
    map.value.remove();
  }
});
</script>
