<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <select v-model="selectedStatus" @change="applyFilters" class="input">
            <option value="">All Orders</option>
            <option value="pending">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
          <select v-model="orderType" @change="applyFilters" class="input">
            <option value="purchases">My Purchases</option>
            <option value="sales">My Sales</option>
          </select>
        </div>

        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select v-model="sortBy" @change="applyFilters" class="input">
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="amount-desc">Amount (High to Low)</option>
            <option value="amount-asc">Amount (Low to High)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card text-center text-red-600">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="card text-center py-12">
      <p class="text-gray-600 mb-4">No orders found.</p>
      <router-link to="/products" class="btn btn-primary">
        Browse Products
      </router-link>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-4">
      <div
        v-for="order in orders"
        :key="order.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              Order #{{ order.id.slice(0, 8) }}
            </h3>
            <p class="text-sm text-gray-600">
              {{ formatDate(order.createdAt) }}
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
          >
            {{ order.status }}
          </span>
        </div>

        <div class="flex gap-4 mb-4">
          <!-- Product Image -->
          <div class="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
            <img
              v-if="order.product?.images?.[0]"
              :src="getImageUrl(order.product.images[0])"
              :alt="order.product.title"
              class="w-full h-full object-cover rounded-lg"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          </div>

          <!-- Product Info -->
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 mb-1">
              {{ order.product?.title || 'Product' }}
            </h4>
            <p class="text-sm text-gray-600 mb-2">
              {{ order.product?.description?.slice(0, 100) }}...
            </p>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-gray-700">
                <strong>{{ orderType === 'purchases' ? 'Seller' : 'Buyer' }}:</strong>
                {{ orderType === 'purchases' ? order.seller?.username : order.buyer?.username }}
              </span>
              <span class="text-gray-700">
                <strong>Total:</strong>
                <span class="text-green-600 font-semibold">{{ formatCurrency(order.totalAmount) }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 border-t pt-4">
          <router-link
            :to="`/orders/${order.id}`"
            class="btn btn-sm btn-primary"
          >
            View Details
          </router-link>

          <button
            v-if="order.status === 'pending' && orderType === 'purchases'"
            @click="handlePayOrder(order.id)"
            class="btn btn-sm btn-success"
          >
            Pay Now
          </button>

          <button
            v-if="order.status === 'paid' && orderType === 'sales'"
            @click="handleMarkShipped(order.id)"
            class="btn btn-sm btn-primary"
          >
            Mark as Shipped
          </button>

          <router-link
            v-if="order.status === 'shipped' || order.status === 'delivered'"
            :to="`/deliveries/${order.deliveryId}`"
            class="btn btn-sm btn-secondary"
          >
            Track Delivery
          </router-link>

          <router-link
            :to="`/chat?user=${orderType === 'purchases' ? order.seller?.id : order.buyer?.id}`"
            class="btn btn-sm btn-secondary"
          >
            Message {{ orderType === 'purchases' ? 'Seller' : 'Buyer' }}
          </router-link>

          <button
            v-if="['delivered', 'cancelled'].includes(order.status) && orderType === 'purchases' && !order.hasReview"
            @click="openReviewModal(order)"
            class="btn btn-sm btn-secondary"
          >
            Write Review
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-8">
      <button
        v-for="page in totalPages"
        :key="page"
        @click="currentPage = page; fetchOrders()"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          page === currentPage
            ? 'bg-primary-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
        ]"
      >
        {{ page }}
      </button>
    </div>

    <!-- Review Modal -->
    <div
      v-if="showReviewModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Write a Review</h3>
        <p class="text-sm text-gray-600 mb-4">
          Product: <strong>{{ selectedOrder?.product?.title }}</strong>
        </p>

        <form @submit.prevent="handleSubmitReview">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
            <div class="flex gap-2">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                @click="reviewForm.rating = star"
                class="text-3xl focus:outline-none transition-colors"
                :class="star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'"
              >
                ★
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Comment *</label>
            <textarea
              v-model="reviewForm.comment"
              required
              class="input"
              rows="4"
              maxlength="1000"
              placeholder="Share your experience..."
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              {{ reviewForm.comment.length }} / 1000 characters
            </p>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" :disabled="submittingReview">
              {{ submittingReview ? 'Submitting...' : 'Submit Review' }}
            </button>
            <button type="button" @click="closeReviewModal" class="btn btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { orderService } from '@/services/dashboardService';
import { reviewService } from '@/services/productService';
import { formatCurrency, formatDate, getImageUrl } from '@/utils/helpers';

const router = useRouter();

const orders = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedStatus = ref('');
const orderType = ref('purchases');
const sortBy = ref('date-desc');
const currentPage = ref(1);
const totalPages = ref(1);

const showReviewModal = ref(false);
const selectedOrder = ref(null);
const submittingReview = ref(false);
const reviewForm = reactive({
  rating: 5,
  comment: '',
});

const fetchOrders = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      status: selectedStatus.value || undefined,
      page: currentPage.value,
      limit: 10,
      sort: sortBy.value,
    };

    const data = orderType.value === 'purchases'
      ? await orderService.getMyOrders(params)
      : await orderService.getSales(params);

    orders.value = data.orders || data;
    totalPages.value = data.pages || Math.ceil((data.total || orders.value.length) / 10);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load orders';
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  currentPage.value = 1;
  fetchOrders();
};

const handlePayOrder = (orderId) => {
  router.push(`/orders/${orderId}/payment`);
};

const handleMarkShipped = async (orderId) => {
  if (!confirm('Mark this order as shipped?')) return;

  try {
    await orderService.updateOrderStatus(orderId, 'shipped');
    await fetchOrders();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update order status');
  }
};

const openReviewModal = (order) => {
  selectedOrder.value = order;
  reviewForm.rating = 5;
  reviewForm.comment = '';
  showReviewModal.value = true;
};

const closeReviewModal = () => {
  showReviewModal.value = false;
  selectedOrder.value = null;
};

const handleSubmitReview = async () => {
  if (!reviewForm.rating || !reviewForm.comment) {
    alert('Please provide a rating and comment');
    return;
  }

  submittingReview.value = true;
  try {
    await reviewService.createReview(selectedOrder.value.productId, {
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      orderId: selectedOrder.value.id,
    });

    alert('Review submitted successfully!');
    closeReviewModal();
    await fetchOrders();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to submit review');
  } finally {
    submittingReview.value = false;
  }
};

onMounted(() => {
  fetchOrders();
});
</script>
