<template>
  <div class="subscriptions">
    <div class="subscriptions-header">
      <h1>🔄 My Subscriptions</h1>
      <p>Manage your recurring product subscriptions</p>
    </div>

    <!-- Active Subscriptions -->
    <div v-if="activeSubscriptions.length" class="subscriptions-section">
      <h2>Active Subscriptions ({{ activeSubscriptions.length }})</h2>
      <div class="subscriptions-grid">
        <div
          v-for="sub in activeSubscriptions"
          :key="sub.id"
          class="subscription-card active"
        >
          <div class="subscription-header">
            <div class="product-info">
              <img
                :src="sub.plan?.product?.images?.[0] || '/placeholder.png'"
                :alt="sub.plan?.product?.name"
                class="product-image"
              />
              <div>
                <h3>{{ sub.plan?.product?.name }}</h3>
                <p class="plan-name">{{ sub.plan?.name }}</p>
              </div>
            </div>
            <span class="status-badge active">Active</span>
          </div>

          <div class="subscription-details">
            <div class="detail-row">
              <span class="label">Price:</span>
              <span class="value price">${{ sub.plan?.price }} / {{ sub.plan?.interval }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Next Billing:</span>
              <span class="value">{{ formatDate(sub.nextBillingDate) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Started:</span>
              <span class="value">{{ formatDate(sub.startDate) }}</span>
            </div>
            <div v-if="sub.plan?.discount" class="detail-row">
              <span class="label">Discount:</span>
              <span class="value discount">{{ sub.plan.discount }}% off</span>
            </div>
          </div>

          <div class="subscription-actions">
            <button @click="viewDetails(sub)" class="btn btn-secondary btn-sm">
              📋 View Details
            </button>
            <button
              @click="cancelSubscription(sub.id)"
              class="btn btn-danger btn-sm"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancelled Subscriptions -->
    <div v-if="cancelledSubscriptions.length" class="subscriptions-section">
      <h2>Cancelled Subscriptions ({{ cancelledSubscriptions.length }})</h2>
      <div class="subscriptions-grid">
        <div
          v-for="sub in cancelledSubscriptions"
          :key="sub.id"
          class="subscription-card cancelled"
        >
          <div class="subscription-header">
            <div class="product-info">
              <img
                :src="sub.plan?.product?.images?.[0] || '/placeholder.png'"
                :alt="sub.plan?.product?.name"
                class="product-image"
              />
              <div>
                <h3>{{ sub.plan?.product?.name }}</h3>
                <p class="plan-name">{{ sub.plan?.name }}</p>
              </div>
            </div>
            <span class="status-badge cancelled">Cancelled</span>
          </div>

          <div class="subscription-details">
            <div class="detail-row">
              <span class="label">Cancelled On:</span>
              <span class="value">{{ formatDate(sub.endDate) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Was Active:</span>
              <span class="value">
                {{ formatDate(sub.startDate) }} - {{ formatDate(sub.endDate) }}
              </span>
            </div>
          </div>

          <div class="subscription-actions">
            <button @click="resubscribe(sub.plan.id)" class="btn btn-primary btn-sm">
              🔄 Resubscribe
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Plans -->
    <div class="subscriptions-section">
      <h2>Available Subscription Plans</h2>
      <div class="plans-grid">
        <div
          v-for="plan in availablePlans"
          :key="plan.id"
          class="plan-card"
        >
          <div v-if="plan.discount" class="plan-badge">
            {{ plan.discount }}% OFF
          </div>

          <img
            :src="plan.product?.images?.[0] || '/placeholder.png'"
            :alt="plan.product?.name"
            class="plan-image"
          />

          <div class="plan-content">
            <h3>{{ plan.product?.name }}</h3>
            <p class="plan-description">{{ plan.description }}</p>

            <div class="plan-price">
              <span class="price">${{ plan.price }}</span>
              <span class="interval">/ {{ plan.interval }}</span>
            </div>

            <ul class="plan-features">
              <li v-for="(feature, index) in plan.features" :key="index">
                ✓ {{ feature }}
              </li>
            </ul>

            <button
              @click="subscribe(plan.id)"
              :disabled="isAlreadySubscribed(plan.id)"
              class="btn btn-primary"
            >
              <span v-if="isAlreadySubscribed(plan.id)">
                ✓ Already Subscribed
              </span>
              <span v-else>
                🛒 Subscribe Now
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!activeSubscriptions.length && !cancelledSubscriptions.length && !loading" class="empty-state">
      <div class="empty-icon">📦</div>
      <h2>No Subscriptions Yet</h2>
      <p>Subscribe to products and save with recurring deliveries</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading subscriptions...</p>
    </div>

    <!-- Details Modal -->
    <div v-if="selectedSubscription" class="modal-overlay" @click="selectedSubscription = null">
      <div class="modal" @click.stop>
        <h2>Subscription Details</h2>

        <div class="modal-content">
          <div class="product-header">
            <img
              :src="selectedSubscription.plan?.product?.images?.[0] || '/placeholder.png'"
              :alt="selectedSubscription.plan?.product?.name"
            />
            <div>
              <h3>{{ selectedSubscription.plan?.product?.name }}</h3>
              <p>{{ selectedSubscription.plan?.name }}</p>
            </div>
          </div>

          <div class="detail-list">
            <div class="detail-item">
              <strong>Status:</strong>
              <span>{{ selectedSubscription.status }}</span>
            </div>
            <div class="detail-item">
              <strong>Price:</strong>
              <span>${{ selectedSubscription.plan?.price }} / {{ selectedSubscription.plan?.interval }}</span>
            </div>
            <div class="detail-item">
              <strong>Start Date:</strong>
              <span>{{ formatDate(selectedSubscription.startDate) }}</span>
            </div>
            <div v-if="selectedSubscription.nextBillingDate" class="detail-item">
              <strong>Next Billing:</strong>
              <span>{{ formatDate(selectedSubscription.nextBillingDate) }}</span>
            </div>
            <div v-if="selectedSubscription.endDate" class="detail-item">
              <strong>End Date:</strong>
              <span>{{ formatDate(selectedSubscription.endDate) }}</span>
            </div>
          </div>

          <div v-if="selectedSubscription.plan?.description" class="plan-description">
            <strong>Plan Description:</strong>
            <p>{{ selectedSubscription.plan.description }}</p>
          </div>
        </div>

        <button @click="selectedSubscription = null" class="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { enhancedFeaturesService } from '@/services/enhancedFeaturesService';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const subscriptions = ref([]);
const availablePlans = ref([]);
const loading = ref(true);
const selectedSubscription = ref(null);

const activeSubscriptions = computed(() =>
  subscriptions.value.filter((sub) => sub.status === 'active')
);

const cancelledSubscriptions = computed(() =>
  subscriptions.value.filter((sub) => sub.status === 'cancelled')
);

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const isAlreadySubscribed = (planId) => {
  return activeSubscriptions.value.some((sub) => sub.plan?.id === planId);
};

const loadSubscriptions = async () => {
  loading.value = true;
  try {
    const data = await enhancedFeaturesService.subscriptionService.getMySubscriptions();
    subscriptions.value = data;
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    toast.error('Failed to load subscriptions');
  } finally {
    loading.value = false;
  }
};

const loadAvailablePlans = async () => {
  try {
    // This would typically fetch from a separate endpoint
    // For now, using mock data structure
    availablePlans.value = [
      {
        id: 1,
        name: 'Monthly Coffee Beans',
        description: 'Fresh roasted coffee delivered monthly',
        price: 19.99,
        interval: 'month',
        discount: 10,
        features: [
          'Free shipping',
          'Cancel anytime',
          'Choose your roast',
          'Exclusive blends'
        ],
        product: {
          name: 'Premium Coffee Subscription',
          images: ['/images/coffee.jpg']
        }
      }
    ];
  } catch (error) {
    console.error('Error loading plans:', error);
  }
};

const subscribe = async (planId) => {
  try {
    await enhancedFeaturesService.subscriptionService.subscribe({ planId });
    toast.success('Successfully subscribed!');
    loadSubscriptions();
  } catch (error) {
    console.error('Error subscribing:', error);
    toast.error('Failed to subscribe. Please try again.');
  }
};

const resubscribe = async (planId) => {
  await subscribe(planId);
};

const cancelSubscription = async (subscriptionId) => {
  if (!confirm('Are you sure you want to cancel this subscription?')) {
    return;
  }

  try {
    await enhancedFeaturesService.subscriptionService.cancel(subscriptionId);
    toast.success('Subscription cancelled successfully');
    loadSubscriptions();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    toast.error('Failed to cancel subscription');
  }
};

const viewDetails = (subscription) => {
  selectedSubscription.value = subscription;
};

onMounted(() => {
  loadSubscriptions();
  loadAvailablePlans();
});
</script>

<style scoped>
.subscriptions {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.subscriptions-header {
  text-align: center;
  margin-bottom: 3rem;
}

.subscriptions-header h1 {
  margin-bottom: 0.5rem;
}

.subscriptions-header p {
  color: #666;
}

.subscriptions-section {
  margin-bottom: 3rem;
}

.subscriptions-section h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.subscriptions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.subscription-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.subscription-card.active {
  border-color: #28a745;
}

.subscription-card.cancelled {
  opacity: 0.7;
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.product-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.product-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.product-info h3 {
  margin-bottom: 0.25rem;
  font-size: 1.1rem;
}

.plan-name {
  color: #666;
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #28a745;
  color: white;
}

.status-badge.cancelled {
  background: #dc3545;
  color: white;
}

.subscription-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-row .label {
  color: #666;
}

.detail-row .value {
  font-weight: 600;
}

.detail-row .price {
  color: #28a745;
  font-size: 1rem;
}

.detail-row .discount {
  color: #007bff;
}

.subscription-actions {
  display: flex;
  gap: 0.5rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.plan-card {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plan-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #ff6b6b;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.75rem;
  z-index: 1;
}

.plan-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.plan-content {
  padding: 1.5rem;
}

.plan-content h3 {
  margin-bottom: 0.5rem;
}

.plan-description {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.plan-price {
  margin-bottom: 1rem;
}

.plan-price .price {
  font-size: 2rem;
  font-weight: 700;
  color: #28a745;
}

.plan-price .interval {
  color: #666;
  font-size: 1rem;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
}

.plan-features li {
  padding: 0.5rem 0;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

.btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  flex: 1;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.empty-state,
.loading {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.product-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.product-header img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}
</style>
