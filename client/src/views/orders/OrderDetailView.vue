<template>
  <div class="container mx-auto px-4 py-8 max-w-5xl">
    <!-- Back Button -->
    <button @click="$router.back()" class="mb-6 text-primary-600 hover:text-primary-700 flex items-center gap-2">
      ← Back to Orders
    </button>

    <!-- Loading State -->
    <div v-if="loading" class="card animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card text-center text-red-600">
      {{ error }}
    </div>

    <!-- Order Details -->
    <div v-else-if="order">
      <!-- Header -->
      <div class="card mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              Order #{{ order.id.slice(0, 8) }}
            </h1>
            <p class="text-sm text-gray-600">
              Placed on {{ formatDate(order.createdAt) }}
            </p>
          </div>
          <span
            :class="{
              'badge-warning': order.status === 'pending',
              'badge-success': order.status === 'paid',
              'badge-primary': order.status === 'shipped',
              'badge-success': order.status === 'delivered',
              'badge-danger': order.status === 'cancelled',
            }"
            class="text-lg"
          >
            {{ order.status }}
          </span>
        </div>

        <!-- Status Timeline -->
        <div class="border-t pt-6">
          <h3 class="font-semibold text-gray-900 mb-4">Order Status</h3>
          <div class="relative">
            <div class="absolute left-0 top-2 bottom-2 w-1 bg-gray-200"></div>
            <div
              class="absolute left-0 top-2 w-1 bg-primary-600 transition-all"
              :style="{ height: getTimelineProgress() }"
            ></div>

            <div class="space-y-6 relative">
              <div
                v-for="(step, index) in orderSteps"
                :key="step.status"
                class="flex items-start gap-4 relative"
              >
                <div
                  :class="[
                    'w-4 h-4 rounded-full flex-shrink-0 z-10 mt-0.5',
                    step.completed ? 'bg-primary-600' : 'bg-gray-300'
                  ]"
                ></div>
                <div>
                  <p :class="['font-medium', step.completed ? 'text-gray-900' : 'text-gray-500']">
                    {{ step.label }}
                  </p>
                  <p v-if="step.timestamp" class="text-sm text-gray-600">
                    {{ formatDate(step.timestamp) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Product Details -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Product</h2>
            <div class="flex gap-4">
              <div class="w-32 h-32 bg-gray-200 rounded-lg flex-shrink-0">
                <img
                  v-if="order.product?.images?.[0]"
                  :src="getImageUrl(order.product.images[0])"
                  :alt="order.product.title"
                  class="w-full h-full object-cover rounded-lg"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900 mb-2">
                  {{ order.product?.title }}
                </h3>
                <p class="text-sm text-gray-600 mb-3">
                  {{ order.product?.description }}
                </p>
                <router-link
                  :to="`/products/${order.productId}`"
                  class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View Product →
                </router-link>
              </div>
            </div>
          </div>

          <!-- Parties -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Parties</h2>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-sm text-gray-600 mb-1">Buyer</p>
                <p class="font-medium text-gray-900">{{ order.buyer?.username }}</p>
                <p class="text-sm text-gray-600">{{ order.buyer?.email }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 mb-1">Seller</p>
                <p class="font-medium text-gray-900">{{ order.seller?.username }}</p>
                <p class="text-sm text-gray-600">{{ order.seller?.email }}</p>
              </div>
            </div>
          </div>

          <!-- Delivery Information -->
          <div v-if="order.deliveryAddress || order.delivery" class="card">
            <h2 class="text-xl font-semibold mb-4">Delivery Information</h2>
            <div class="space-y-3">
              <div v-if="order.deliveryAddress">
                <p class="text-sm text-gray-600">Delivery Address</p>
                <p class="font-medium text-gray-900">{{ order.deliveryAddress }}</p>
              </div>
              <div v-if="order.delivery">
                <p class="text-sm text-gray-600">Status</p>
                <p class="font-medium text-gray-900">
                  <span
                    :class="{
                      'badge-warning': order.delivery.status === 'pending',
                      'badge-primary': order.delivery.status === 'assigned',
                      'badge-primary': order.delivery.status === 'picked_up',
                      'badge-success': order.delivery.status === 'delivered',
                    }"
                  >
                    {{ order.delivery.status }}
                  </span>
                </p>
              </div>
              <div v-if="order.delivery?.courier">
                <p class="text-sm text-gray-600">Courier</p>
                <p class="font-medium text-gray-900">{{ order.delivery.courier.username }}</p>
              </div>
              <div v-if="order.delivery?.trackingNumber">
                <p class="text-sm text-gray-600">Tracking Number</p>
                <p class="font-mono text-sm text-gray-900">{{ order.delivery.trackingNumber }}</p>
              </div>
              <router-link
                v-if="order.delivery"
                :to="`/deliveries/${order.delivery.id}`"
                class="btn btn-sm btn-primary"
              >
                Track Delivery →
              </router-link>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Payment Summary -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Payment Summary</h2>
            <div class="space-y-2 mb-4">
              <div class="flex justify-between text-gray-700">
                <span>Item Price</span>
                <span>{{ formatCurrency(order.totalAmount) }}</span>
              </div>
              <div v-if="order.platformFee" class="flex justify-between text-gray-700">
                <span>Platform Fee</span>
                <span>{{ formatCurrency(order.platformFee) }}</span>
              </div>
              <div v-if="order.deliveryFee" class="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span>{{ formatCurrency(order.deliveryFee) }}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span class="text-green-600">{{ formatCurrency(order.totalAmount + (order.platformFee || 0) + (order.deliveryFee || 0)) }}</span>
              </div>
            </div>

            <div v-if="order.paymentIntentId" class="text-sm text-gray-600">
              <p>Payment ID:</p>
              <p class="font-mono text-xs">{{ order.paymentIntentId.slice(0, 20) }}...</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="card space-y-3">
            <h2 class="text-xl font-semibold mb-4">Actions</h2>

            <button
              v-if="order.status === 'pending' && isBuyer"
              @click="showPaymentModal = true"
              class="btn btn-primary w-full"
            >
              Pay Now
            </button>

            <button
              v-if="order.status === 'paid' && isSeller"
              @click="handleMarkShipped"
              class="btn btn-primary w-full"
            >
              Mark as Shipped
            </button>

            <button
              v-if="order.status === 'shipped' && isBuyer"
              @click="handleMarkDelivered"
              class="btn btn-success w-full"
            >
              Confirm Delivery
            </button>

            <router-link
              :to="`/chat?user=${isBuyer ? order.seller?.id : order.buyer?.id}`"
              class="btn btn-secondary w-full"
            >
              Message {{ isBuyer ? 'Seller' : 'Buyer' }}
            </router-link>

            <button
              v-if="['pending', 'paid'].includes(order.status) && (isBuyer || isSeller)"
              @click="openDisputeModal"
              class="btn btn-danger w-full"
            >
              Open Dispute
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div
      v-if="showPaymentModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">Complete Payment</h3>
        <p class="text-gray-700 mb-6">
          Total Amount: <strong class="text-green-600 text-xl">{{ formatCurrency(order?.totalAmount) }}</strong>
        </p>

        <!-- Payment Methods Component -->
        <PaymentMethods
          v-model="selectedPaymentMethod"
          class="mb-6"
        />

        <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-700">
            💳 Your payment information is secure and encrypted.
          </p>
        </div>

        <div class="flex gap-3">
          <button
            @click="handlePayment"
            class="btn btn-primary flex-1"
            :disabled="processingPayment"
          >
            {{ processingPayment ? 'Processing...' : 'Complete Payment' }}
          </button>
          <button
            @click="showPaymentModal = false"
            class="btn btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Dispute Modal -->
    <div
      v-if="showDisputeModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold text-red-900 mb-4">Open a Dispute</h3>
        <p class="text-gray-700 mb-4">
          Please describe the issue with this order. Our support team will review and respond within 24-48 hours.
        </p>

        <form @submit.prevent="handleSubmitDispute">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
            <select v-model="disputeForm.reason" required class="input">
              <option value="">Select a reason</option>
              <option value="not_received">Item not received</option>
              <option value="not_as_described">Item not as described</option>
              <option value="damaged">Item damaged</option>
              <option value="wrong_item">Wrong item received</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              v-model="disputeForm.description"
              required
              class="input"
              rows="4"
              placeholder="Please provide details..."
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="btn btn-danger flex-1" :disabled="submittingDispute">
              {{ submittingDispute ? 'Submitting...' : 'Submit Dispute' }}
            </button>
            <button type="button" @click="closeDisputeModal" class="btn btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { orderService } from '@/services/dashboardService';
import apiClient from '@/services/apiClient';
import { formatCurrency, formatDate, getImageUrl } from '@/utils/helpers';
import PaymentMethods from '@/components/PaymentMethods.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const order = ref(null);
const loading = ref(false);
const error = ref(null);
const showPaymentModal = ref(false);
const showDisputeModal = ref(false);
const processingPayment = ref(false);
const submittingDispute = ref(false);
const selectedPaymentMethod = ref({
  provider: 'flutterwave',
  method: 'card'
});

const disputeForm = reactive({
  reason: '',
  description: '',
});

const isBuyer = computed(() => order.value?.buyerId === authStore.user?.id);
const isSeller = computed(() => order.value?.sellerId === authStore.user?.id);

const orderSteps = computed(() => {
  if (!order.value) return [];
  
  const steps = [
    { status: 'pending', label: 'Order Placed', completed: true, timestamp: order.value.createdAt },
    { status: 'paid', label: 'Payment Received', completed: ['paid', 'shipped', 'delivered'].includes(order.value.status), timestamp: order.value.paidAt },
    { status: 'shipped', label: 'Shipped', completed: ['shipped', 'delivered'].includes(order.value.status), timestamp: order.value.shippedAt },
    { status: 'delivered', label: 'Delivered', completed: order.value.status === 'delivered', timestamp: order.value.deliveredAt },
  ];

  return steps;
});

const getTimelineProgress = () => {
  const completedSteps = orderSteps.value.filter(s => s.completed).length;
  const totalSteps = orderSteps.value.length;
  return `${(completedSteps / totalSteps) * 100}%`;
};

const fetchOrder = async () => {
  loading.value = true;
  error.value = null;

  try {
    order.value = await orderService.getOrder(route.params.id);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load order';
  } finally {
    loading.value = false;
  }
};

const handlePayment = async () => {
  processingPayment.value = true;

  try {
    const paymentData = {
      paymentProvider: selectedPaymentMethod.value.provider,
      paymentMethod: selectedPaymentMethod.value.method,
    };

    // Add payment method ID for Stripe if needed
    if (selectedPaymentMethod.value.provider === 'stripe') {
      // In a real app, this would come from Stripe Elements
      paymentData.paymentMethodId = 'pm_simulated_' + Date.now();
    }

    const response = await orderService.payOrder(order.value.id, paymentData);

    if (selectedPaymentMethod.value.provider === 'flutterwave' && response.paymentUrl) {
      // Redirect to Flutterwave payment page
      window.location.href = response.paymentUrl;
    } else {
      // Handle Stripe or direct payment completion
      showPaymentModal.value = false;
      alert('Payment successful!');
      await fetchOrder();
    }
  } catch (err) {
    const errorMessage = err.response?.data?.message || 'Payment failed';
    alert(errorMessage);
  } finally {
    processingPayment.value = false;
  }
};

const handleMarkShipped = async () => {
  if (!confirm('Mark this order as shipped?')) return;

  try {
    await orderService.updateOrderStatus(order.value.id, 'shipped');
    await fetchOrder();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update order');
  }
};

const handleMarkDelivered = async () => {
  if (!confirm('Confirm that you have received this order?')) return;

  try {
    await orderService.updateOrderStatus(order.value.id, 'delivered');
    await fetchOrder();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update order');
  }
};

const openDisputeModal = () => {
  disputeForm.reason = '';
  disputeForm.description = '';
  showDisputeModal.value = true;
};

const closeDisputeModal = () => {
  showDisputeModal.value = false;
};

const handleSubmitDispute = async () => {
  if (!disputeForm.reason || !disputeForm.description) {
    alert('Please fill in all fields');
    return;
  }

  submittingDispute.value = true;

  try {
    await apiClient.post('/api/orders/disputes', {
      orderId: order.value.id,
      reason: disputeForm.reason,
      description: disputeForm.description,
    });

    alert('Dispute submitted successfully. Our team will review it shortly.');
    closeDisputeModal();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to submit dispute');
  } finally {
    submittingDispute.value = false;
  }
};

onMounted(() => {
  fetchOrder();
});
</script>
