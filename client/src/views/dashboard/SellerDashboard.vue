<template>
  <DashboardLayout title="Seller Dashboard" :sidebar-menu="sidebarMenu">

    <!-- Stats Cards -->
    <div v-if="loading.stats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div v-for="i in 4" :key="i" class="card animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>

    <div v-else-if="sellerStats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <p class="text-sm opacity-90 mb-1">Active Products</p>
        <p class="text-3xl font-bold">{{ sellerStats.activeProducts || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <p class="text-sm opacity-90 mb-1">Pending Offers</p>
        <p class="text-3xl font-bold">{{ sellerStats.pendingOffers || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
        <p class="text-sm opacity-90 mb-1">Total Sales</p>
        <p class="text-3xl font-bold">{{ sellerStats.totalSales || 0 }}</p>
      </div>
      <div class="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
        <p class="text-sm opacity-90 mb-1">Revenue</p>
        <p class="text-3xl font-bold">{{ formatCurrency(sellerStats.totalRevenue || 0) }}</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card mb-8">
      <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
      <div class="flex flex-wrap gap-4">
        <router-link to="/products/new" class="btn btn-primary">
          Add New Product
        </router-link>
        <router-link to="/products?filter=myproducts" class="btn btn-secondary">
          My Products
        </router-link>
        <router-link to="/orders" class="btn btn-secondary">
          View Sales
        </router-link>
        <router-link to="/chat" class="btn btn-secondary">
          Messages
        </router-link>
      </div>
    </div>

    <!-- Incoming Bid Requests -->
    <div class="card mb-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Incoming Bid Requests</h2>
        <span class="badge-primary">{{ receivedBids.length }} Total</span>
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

      <div v-else-if="receivedBids.length === 0" class="text-center py-8 text-gray-500">
        <p>No bid requests yet.</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="bid in receivedBids.slice(0, 5)"
          :key="bid.id"
          class="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-gray-900">
                  {{ bid.product?.title || 'Product' }}
                </h3>
                <span
                  :class="{
                    'badge-warning': bid.status === 'pending',
                    'badge-success': bid.status === 'accepted',
                    'badge-danger': bid.status === 'rejected',
                    'badge-primary': bid.status === 'offer_sent',
                  }"
                >
                  {{ formatBidStatus(bid.status) }}
                </span>
              </div>
              <p class="text-sm text-gray-600 mb-2">{{ bid.description }}</p>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-700">
                  Buyer Budget: <strong>{{ formatCurrency(bid.budget) }}</strong>
                </span>
                <span class="text-gray-600">
                  From: <strong>{{ bid.buyer?.username || 'Buyer' }}</strong>
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Requested {{ formatRelativeTime(bid.createdAt) }}
              </p>
            </div>

            <div v-if="bid.status === 'pending'" class="ml-4">
              <button
                @click="openOfferModal(bid)"
                class="btn btn-sm btn-primary mb-2 w-full"
              >
                Send Offer
              </button>
              <button
                @click="handleRejectBid(bid.id)"
                class="btn btn-sm btn-danger w-full"
              >
                Decline
              </button>
            </div>

            <div v-else-if="bid.offerPrice" class="ml-4 text-right">
              <p class="text-sm text-gray-600">Your Offer:</p>
              <p class="text-xl font-bold text-green-600">
                {{ formatCurrency(bid.offerPrice) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Recent Sales</h2>
        <router-link to="/orders?type=sales" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View All Sales →
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

      <div v-else-if="mySales.length === 0" class="text-center py-8 text-gray-500">
        <p>No sales yet.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Buyer</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in mySales.slice(0, 5)"
              :key="order.id"
              class="border-b hover:bg-gray-50"
            >
              <td class="py-3 px-4 text-sm font-mono text-gray-600">
                #{{ order.id.slice(0, 8) }}
              </td>
              <td class="py-3 px-4">
                <div class="font-medium text-gray-900">{{ order.product?.title || 'Product' }}</div>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ order.buyer?.username || 'Buyer' }}
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

    <!-- Offer Modal -->
    <div v-if="showOfferModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Send Offer</h3>
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">Product: <strong>{{ selectedBid?.product?.title }}</strong></p>
          <p class="text-sm text-gray-600 mb-4">Buyer Budget: <strong>{{ formatCurrency(selectedBid?.budget) }}</strong></p>
        </div>

        <form @submit.prevent="handleSubmitOffer">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Your Offer Price *
            </label>
            <input
              v-model.number="offerForm.price"
              type="number"
              step="0.01"
              min="0.01"
              required
              class="input"
              placeholder="0.00"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              v-model="offerForm.message"
              class="input"
              rows="3"
              placeholder="Add a message to your offer..."
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" :disabled="submitting">
              {{ submitting ? 'Sending...' : 'Send Offer' }}
            </button>
            <button type="button" @click="closeOfferModal" class="btn btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { formatCurrency, formatBidStatus } from '@/utils/helpers';
import DashboardLayout from '@/components/DashboardLayout.vue';
import { ChartBarIcon, PlusIcon, CubeIcon, ShoppingBagIcon, ChatBubbleLeftIcon } from '@heroicons/vue/24/outline';

const dashboardStore = useDashboardStore();

const sidebarMenu = [
  { path: '/dashboard', label: 'Overview', icon: ChartBarIcon },
  { path: '/products/new', label: 'Add Product', icon: PlusIcon },
  { path: '/products?filter=myproducts', label: 'My Products', icon: CubeIcon },
  { path: '/orders', label: 'Sales', icon: ShoppingBagIcon },
  { path: '/chat', label: 'Messages', icon: ChatBubbleLeftIcon },
];

const sellerStats = computed(() => dashboardStore.sellerStats);
const receivedBids = computed(() => dashboardStore.receivedBids);
const mySales = computed(() => dashboardStore.mySales);
const loading = computed(() => dashboardStore.loading);
const error = computed(() => dashboardStore.error);

const showOfferModal = ref(false);
const selectedBid = ref(null);
const submitting = ref(false);
const offerForm = ref({
  price: '',
  message: '',
});

const openOfferModal = (bid) => {
  selectedBid.value = bid;
  offerForm.value = {
    price: bid.budget,
    message: '',
  };
  showOfferModal.value = true;
};

const closeOfferModal = () => {
  showOfferModal.value = false;
  selectedBid.value = null;
  offerForm.value = { price: '', message: '' };
};

const handleSubmitOffer = async () => {
  if (!offerForm.value.price || offerForm.value.price <= 0) {
    alert('Please enter a valid offer price');
    return;
  }

  submitting.value = true;
  try {
    await dashboardStore.submitOffer(selectedBid.value.id, {
      offerPrice: offerForm.value.price,
      offerMessage: offerForm.value.message,
    });
    closeOfferModal();
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to submit offer');
  } finally {
    submitting.value = false;
  }
};

const handleRejectBid = async (bidId) => {
  if (!confirm('Decline this bid request?')) return;

  try {
    await dashboardStore.rejectOffer(bidId);
  } catch (error) {
    alert(error.response?.data?.message || 'Failed to reject bid');
  }
};

onMounted(async () => {
  try {
    await dashboardStore.fetchSellerDashboard();
  } catch (error) {
    console.error('Failed to load seller dashboard:', error);
  }
});
</script>
