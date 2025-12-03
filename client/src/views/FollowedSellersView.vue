<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Followed Sellers</h1>
        <p class="text-gray-600 mt-2">
          Sellers you're following and their latest products
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="card animate-pulse">
          <div class="bg-gray-300 h-32 rounded-lg mb-4"></div>
          <div class="bg-gray-300 h-4 rounded w-2/3 mb-2"></div>
          <div class="bg-gray-300 h-3 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Followed Sellers List -->
      <div v-else-if="followedSellers.length" class="space-y-8">
        <!-- Seller Card -->
        <div
          v-for="seller in followedSellers"
          :key="seller.id"
          class="card"
        >
          <div class="flex items-center justify-between mb-6">
            <!-- Seller Info -->
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl">
                {{ (seller.seller?.username || 'S')[0].toUpperCase() }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">
                  {{ seller.seller?.username || 'Unknown Seller' }}
                </h2>
                <p class="text-sm text-gray-600">
                  {{ seller.productsCount || 0 }} products • Followed {{ formatRelativeTime(seller.createdAt) }}
                </p>
              </div>
            </div>

            <!-- Unfollow Button -->
            <button
              @click="unfollowSeller(seller.sellerId)"
              class="btn btn-secondary"
            >
              Following
            </button>
          </div>

          <!-- Seller Products -->
          <div v-if="sellerProducts[seller.sellerId]?.length" class="space-y-4">
            <h3 class="font-semibold text-gray-900">Latest Products</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                v-for="product in sellerProducts[seller.sellerId]"
                :key="product.id"
                class="cursor-pointer hover:shadow-lg transition-shadow rounded-lg overflow-hidden border border-gray-200"
                @click="router.push(`/products/${product.id}`)"
              >
                <img
                  :src="getImageUrl(product.images?.[0] || product.imageUrl)"
                  :alt="product.title"
                  class="w-full h-32 object-cover"
                />
                <div class="p-3">
                  <h4 class="font-medium text-sm line-clamp-2 mb-1">{{ product.title }}</h4>
                  <p class="text-primary-600 font-semibold text-sm">{{ formatCurrency(product.price) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-8">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="currentPage = page; fetchFollowedSellers()"
            :class="[
              'px-4 py-2 rounded-lg border',
              currentPage === page
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            ]"
          >
            {{ page }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card text-center py-16">
        <div class="text-6xl mb-4">👥</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">No Followed Sellers</h2>
        <p class="text-gray-600 mb-6">
          Start following sellers to see their latest products here
        </p>
        <router-link to="/products" class="btn btn-primary">
          Browse Products
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import sellerFollowService from '../services/sellerFollowService';
import { formatCurrency, formatRelativeTime } from '../utils/helpers';

const router = useRouter();

const loading = ref(true);
const followedSellers = ref([]);
const sellerProducts = ref({});
const currentPage = ref(1);
const totalPages = ref(1);

const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${imagePath}`;
};

const fetchFollowedSellers = async () => {
  loading.value = true;

  try {
    const data = await sellerFollowService.getFollowedSellers(currentPage.value, 20);
    followedSellers.value = data.sellers || [];
    totalPages.value = data.totalPages || 1;

    // Fetch latest products for each seller
    // In production, you'd have an endpoint that returns sellers with their products
    // For now, we'll fetch new products from all followed sellers
    if (followedSellers.value.length > 0) {
      const productsData = await sellerFollowService.getNewProductsFromFollowedSellers(20);
      
      // Group products by seller
      if (productsData.products) {
        const grouped = {};
        productsData.products.forEach(product => {
          if (!grouped[product.sellerId]) {
            grouped[product.sellerId] = [];
          }
          if (grouped[product.sellerId].length < 4) {
            grouped[product.sellerId].push(product);
          }
        });
        sellerProducts.value = grouped;
      }
    }
  } catch (err) {
    console.error('Failed to load followed sellers:', err);
  } finally {
    loading.value = false;
  }
};

const unfollowSeller = async (sellerId) => {
  if (!confirm('Are you sure you want to unfollow this seller?')) return;

  try {
    await sellerFollowService.unfollowSeller(sellerId);
    // Refresh the list
    await fetchFollowedSellers();
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to unfollow seller');
  }
};

onMounted(() => {
  fetchFollowedSellers();
});
</script>
