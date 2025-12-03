<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Bid Requests</h1>
          <p class="text-gray-600 mt-1">
            Browse buyer requests and submit offers
          </p>
        </div>
        <router-link
          v-if="authStore.isBuyer"
          to="/requests/create"
          class="btn btn-primary"
        >
          + Post Request
        </router-link>
      </div>

      <!-- Filters -->
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4 items-end">
          <!-- Search -->
          <div class="flex-1 min-w-[200px]">
            <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              v-model="filters.search"
              @input="debouncedSearch"
              type="text"
              placeholder="Search requests..."
              class="input"
            />
          </div>

          <!-- Category -->
          <div class="flex-1 min-w-[150px]">
            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select v-model="filters.category" @change="applyFilters" class="input">
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing & Fashion</option>
              <option value="home">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="books">Books & Media</option>
              <option value="automotive">Automotive</option>
              <option value="collectibles">Collectibles</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Budget Range -->
          <div class="flex-1 min-w-[150px]">
            <label class="block text-sm font-medium text-gray-700 mb-2">Max Budget</label>
            <select v-model="filters.maxBudget" @change="applyFilters" class="input">
              <option value="">Any Budget</option>
              <option value="50">Under $50</option>
              <option value="100">Under $100</option>
              <option value="500">Under $500</option>
              <option value="1000">Under $1000</option>
              <option value="5000">Under $5000</option>
            </select>
          </div>

          <!-- Sort -->
          <div class="flex-1 min-w-[150px]">
            <label class="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select v-model="filters.sortBy" @change="applyFilters" class="input">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="budget-high">Highest Budget</option>
              <option value="budget-low">Lowest Budget</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <button
            v-if="hasFilters"
            @click="clearFilters"
            class="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card text-center text-red-600">
        {{ error }}
      </div>

      <!-- Requests Grid -->
      <div v-else-if="requests.length" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="request in requests"
          :key="request.id"
          class="card hover:shadow-lg transition-shadow"
        >
          <!-- Header -->
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-semibold text-gray-900 line-clamp-2">
              {{ request.title || request.message || 'Product Request' }}
            </h3>
            <span class="badge badge-primary text-xs">
              {{ request.category || 'General' }}
            </span>
          </div>

          <!-- Budget -->
          <div class="mb-3">
            <p class="text-2xl font-bold text-primary-600">
              {{ formatCurrency(request.amount) }}
            </p>
            <p class="text-sm text-gray-600">Budget</p>
          </div>

          <!-- Description -->
          <p class="text-gray-700 text-sm mb-4 line-clamp-3">
            {{ request.description || request.message }}
          </p>

          <!-- Details -->
          <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
            <span v-if="request.location">📍 {{ request.location }}</span>
            <span>{{ formatRelativeTime(request.createdAt) }}</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <router-link
              :to="`/requests/${request.id}`"
              class="btn btn-primary btn-sm flex-1 text-center"
            >
              View Details
            </router-link>
            <button
              v-if="authStore.isSeller && !hasSubmittedOffer(request)"
              @click="quickOffer(request)"
              class="btn btn-secondary btn-sm"
            >
              Quick Offer
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card text-center py-12">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
        <p class="text-gray-600 mb-6">
          {{ hasFilters ? 'Try adjusting your filters' : 'Be the first to post a request!' }}
        </p>
        <router-link
          v-if="authStore.isBuyer"
          to="/requests/create"
          class="btn btn-primary"
        >
          Post Your First Request
        </router-link>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !loading" class="text-center mt-8">
        <button
          @click="loadMore"
          class="btn btn-secondary"
        >
          Load More Requests
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useProductStore } from '../../stores/product';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';
import { bidService } from '../../services/dashboardService';

const authStore = useAuthStore();
const productStore = useProductStore();

const loading = ref(false);
const error = ref(null);
const requests = ref([]);
const hasMore = ref(false);

const filters = ref({
  search: '',
  category: '',
  maxBudget: '',
  sortBy: 'newest',
});

const hasFilters = computed(() => {
  return filters.value.search || filters.value.category || filters.value.maxBudget;
});

// Debounced search
let searchTimeout;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 500);
};

const formatCategory = (category) => {
  const labels = {
    electronics: 'Electronics',
    clothing: 'Clothing',
    home: 'Home',
    sports: 'Sports',
    books: 'Books',
    automotive: 'Auto',
    collectibles: 'Collectibles',
    other: 'Other',
  };
  return labels[category] || category;
};

const hasSubmittedOffer = (request) => {
  // TODO: Check if current seller has submitted an offer for this request
  // This would require loading offer data for each request or caching it
  return false; // Placeholder - would need to implement proper checking
};

const quickOffer = async (request) => {
  const offer = prompt(`Enter your offer amount for "${request.title || request.message}":`);
  if (offer && !isNaN(offer)) {
    try {
      // For quick offer, we need to select a product
      // This is a simplified version - in a real app, you'd show a product selector
      const productId = prompt('Enter the ID of the product you want to offer:');
      if (!productId) return;

      await bidService.submitOffer(request.id, {
        amount: parseFloat(offer),
        message: `Quick offer for $${offer}`,
        productId: productId,
      });

      alert('Offer submitted successfully!');
      // Refresh the requests list
      applyFilters();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit offer');
    }
  }
};

const applyFilters = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      page: 1,
      limit: 20,
    };

    // Add filters if they exist
    if (filters.value.search) params.q = filters.value.search;
    if (filters.value.category) params.category = filters.value.category;
    if (filters.value.maxBudget) params.maxAmount = filters.value.maxBudget;

    // Map sort options to API parameters
    const sortMap = {
      'newest': 'createdAt',
      'oldest': 'createdAt',
      'budget-high': 'amount',
      'budget-low': 'amount',
    };

    const orderMap = {
      'newest': 'desc',
      'oldest': 'asc',
      'budget-high': 'desc',
      'budget-low': 'asc',
    };

    params.sortBy = sortMap[filters.value.sortBy] || 'createdAt';
    params.sortOrder = orderMap[filters.value.sortBy] || 'desc';

    const data = await bidService.getAllRequests(params);
    requests.value = data.items || [];
    hasMore.value = data.meta?.hasMore || false;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load requests';
    requests.value = [];
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

const clearFilters = () => {
  filters.value = {
    search: '',
    category: '',
    maxBudget: '',
    sortBy: 'newest',
  };
  applyFilters();
};

const loadMore = async () => {
  if (loading.value || !hasMore.value) return;

  loading.value = true;

  try {
    const params = {
      page: Math.floor(requests.value.length / 20) + 1,
      limit: 20,
    };

    // Add current filters
    if (filters.value.search) params.q = filters.value.search;
    if (filters.value.category) params.category = filters.value.category;
    if (filters.value.maxBudget) params.maxAmount = filters.value.maxBudget;

    const sortMap = {
      'newest': 'createdAt',
      'oldest': 'createdAt',
      'budget-high': 'amount',
      'budget-low': 'amount',
    };

    const orderMap = {
      'newest': 'desc',
      'oldest': 'asc',
      'budget-high': 'desc',
      'budget-low': 'asc',
    };

    params.sortBy = sortMap[filters.value.sortBy] || 'createdAt';
    params.sortOrder = orderMap[filters.value.sortBy] || 'desc';

    const data = await bidService.getAllRequests(params);
    requests.value.push(...(data.items || []));
    hasMore.value = data.meta?.hasMore || false;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load more requests';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  applyFilters();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>