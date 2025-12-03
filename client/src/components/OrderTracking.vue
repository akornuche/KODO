<template>
  <div class="order-tracking">
    <div class="tracking-header">
      <h1>📦 Track Your Order</h1>
      <p class="order-id">Order #{{ orderId?.slice(0, 8) }}</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading tracking information...</p>
    </div>

    <div v-else-if="trackingData" class="tracking-content">
      <!-- Order Summary -->
      <div class="order-summary">
        <div class="summary-card">
          <h3>Order Status</h3>
          <div class="status-badge" :class="statusClass">
            {{ formatStatus(trackingData.order.status) }}
          </div>
        </div>

        <div class="summary-card">
          <h3>Total Amount</h3>
          <p class="amount">${{ trackingData.order.total }}</p>
        </div>

        <div class="summary-card">
          <h3>Order Date</h3>
          <p>{{ formatDate(trackingData.order.createdAt) }}</p>
        </div>

        <div v-if="trackingData.estimatedDelivery" class="summary-card">
          <h3>Estimated Delivery</h3>
          <p>{{ formatDate(trackingData.estimatedDelivery) }}</p>
        </div>
      </div>

      <!-- Timeline -->
      <div class="tracking-timeline">
        <h2>Order Timeline</h2>
        <div class="timeline">
          <div
            v-for="(step, index) in trackingData.timeline"
            :key="index"
            class="timeline-step"
            :class="{ completed: step.completed, current: isCurrent(step, index) }"
          >
            <div class="step-icon">
              <span v-if="step.completed">✓</span>
              <span v-else>○</span>
            </div>
            <div class="step-content">
              <h4>{{ step.label }}</h4>
              <p class="step-description">{{ step.description }}</p>
              <p v-if="step.timestamp" class="step-time">
                {{ formatDateTime(step.timestamp) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Delivery Information -->
      <div v-if="trackingData.delivery" class="delivery-info">
        <h2>Delivery Details</h2>
        <div class="info-grid">
          <div v-if="trackingData.delivery.trackingNumber" class="info-item">
            <strong>Tracking Number:</strong>
            <span class="tracking-number">
              {{ trackingData.delivery.trackingNumber }}
              <button @click="copyTracking" class="copy-btn" title="Copy">
                📋
              </button>
            </span>
          </div>
          <div v-if="trackingData.delivery.courier" class="info-item">
            <strong>Courier:</strong>
            <span>{{ trackingData.delivery.courier.name }}</span>
          </div>
          <div v-if="trackingData.delivery.currentLocation" class="info-item">
            <strong>Current Location:</strong>
            <span>{{ trackingData.delivery.currentLocation }}</span>
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div class="order-items">
        <h2>Order Items</h2>
        <div class="items-list">
          <div
            v-for="item in trackingData.order.items"
            :key="item.id"
            class="item-card"
          >
            <img
              :src="item.product?.images?.[0] || '/placeholder.png'"
              :alt="item.product?.name"
            />
            <div class="item-info">
              <h4>{{ item.product?.name }}</h4>
              <p class="quantity">Quantity: {{ item.quantity }}</p>
              <p class="price">${{ item.price }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Shipping Address -->
      <div v-if="trackingData.order.shippingAddress" class="shipping-address">
        <h2>Shipping Address</h2>
        <p>{{ trackingData.order.shippingAddress }}</p>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="refreshTracking" class="btn btn-primary">
          🔄 Refresh Tracking
        </button>
        <router-link
          v-if="canLeaveReview"
          to="/leave-review"
          class="btn btn-secondary"
        >
          ⭐ Leave a Review
        </router-link>
      </div>
    </div>

    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadTracking" class="btn btn-primary">
        Try Again
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import orderTrackingService from '@/services/orderTrackingService';
import { useToast } from 'vue-toastification';

const route = useRoute();
const toast = useToast();

const orderId = ref(route.params.orderId || '');
const trackingData = ref(null);
const loading = ref(true);
const error = ref(null);

const statusClass = computed(() => {
  const status = trackingData.value?.order?.status;
  return {
    'status-pending': status === 'pending',
    'status-processing': ['confirmed', 'processing'].includes(status),
    'status-shipped': ['shipped', 'out_for_delivery'].includes(status),
    'status-delivered': ['delivered', 'completed'].includes(status),
    'status-cancelled': ['cancelled', 'refunded'].includes(status),
  };
});

const canLeaveReview = computed(() => {
  return ['delivered', 'completed'].includes(trackingData.value?.order?.status);
});

const loadTracking = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await orderTrackingService.getOrderTracking(orderId.value);
    trackingData.value = data;
  } catch (err) {
    console.error('Tracking error:', err);
    error.value = 'Failed to load tracking information. Please try again.';
  } finally {
    loading.value = false;
  }
};

const refreshTracking = () => {
  loadTracking();
  toast.info('Refreshing tracking information...');
};

const isCurrent = (step, index) => {
  if (!trackingData.value?.timeline) return false;
  
  // Find the last completed step
  const lastCompletedIndex = trackingData.value.timeline
    .map((s, i) => s.completed ? i : -1)
    .filter(i => i >= 0)
    .pop();
  
  return index === (lastCompletedIndex + 1);
};

const formatStatus = (status) => {
  return status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const copyTracking = () => {
  const trackingNumber = trackingData.value?.delivery?.trackingNumber;
  if (trackingNumber) {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('Tracking number copied!');
  }
};

onMounted(() => {
  if (orderId.value) {
    loadTracking();
  } else {
    error.value = 'No order ID provided';
    loading.value = false;
  }
});
</script>

<style scoped>
.order-tracking {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.tracking-header {
  text-align: center;
  margin-bottom: 2rem;
}

.order-id {
  color: #666;
  font-size: 1.1rem;
  margin-top: 0.5rem;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.order-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  text-align: center;
  display: inline-block;
}

.status-pending {
  background: #ffc107;
  color: #000;
}

.status-processing {
  background: #17a2b8;
  color: white;
}

.status-shipped {
  background: #007bff;
  color: white;
}

.status-delivered {
  background: #28a745;
  color: white;
}

.status-cancelled {
  background: #dc3545;
  color: white;
}

.amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #28a745;
}

.tracking-timeline {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.timeline {
  position: relative;
  padding-left: 2rem;
  margin-top: 1.5rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
}

.timeline-step {
  position: relative;
  padding-bottom: 2rem;
  padding-left: 2rem;
}

.timeline-step.completed .step-icon {
  background: #28a745;
  color: white;
}

.timeline-step.current .step-icon {
  background: #007bff;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.step-icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  z-index: 1;
}

.step-content h4 {
  margin-bottom: 0.25rem;
  color: #333;
}

.step-description {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.step-time {
  color: #999;
  font-size: 0.75rem;
}

.delivery-info,
.order-items,
.shipping-address {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  gap: 1rem;
}

.tracking-number {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  transition: transform 0.2s;
}

.copy-btn:hover {
  transform: scale(1.2);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.item-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.item-card img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.item-info {
  flex: 1;
}

.item-info h4 {
  margin-bottom: 0.5rem;
}

.quantity {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.price {
  color: #28a745;
  font-weight: 600;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.error-message {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-message p {
  color: #dc3545;
  margin-bottom: 1rem;
}
</style>
