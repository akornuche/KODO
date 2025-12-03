<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p class="text-gray-600 mt-1">{{ products.length }} item{{ products.length !== 1 ? 's' : '' }}</p>
        </div>
        <button
          v-if="products.length > 0"
          @click="handleClearAll"
          class="btn btn-secondary"
        >
          Clear All
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="i in 8" :key="i" class="card animate-pulse">
          <div class="aspect-square bg-gray-200 rounded-lg mb-4"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0" class="text-center py-16">
        <svg class="w-24 h-24 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
        <p class="text-gray-600 mb-6">Save items you like to your wishlist to buy them later!</p>
        <router-link to="/products" class="btn btn-primary">
          Browse Products
        </router-link>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="product in products"
          :key="product.id"
          class="card group relative overflow-hidden hover:shadow-xl transition-shadow"
        >
          <!-- Remove Button -->
          <button
            @click="handleRemove(product.id)"
            class="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-md hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Remove from wishlist"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Product Image -->
          <router-link :to="`/products/${product.id}`" class="block">
            <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              <img
                v-if="product.images && product.images.length > 0"
                :src="getImageUrl(product.images[0])"
                :alt="product.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <!-- Product Info -->
            <h3 class="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {{ product.title }}
            </h3>
            <p class="text-sm text-gray-600 mb-2 line-clamp-1">{{ product.category }}</p>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xl font-bold text-primary-600">
                {{ formatCurrency(product.price) }}
              </span>
              <span v-if="product.rating" class="flex items-center text-sm text-gray-600">
                <svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {{ product.rating.toFixed(1) }}
              </span>
            </div>
          </router-link>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              v-if="authStore.user?.role === 'buyer'"
              @click="handleAddToCart(product)"
              :disabled="!product.stock || product.stock <= 0"
              class="btn btn-primary flex-1 text-sm"
            >
              {{ product.stock > 0 ? 'Add to Cart' : 'Out of Stock' }}
            </button>
            <router-link
              :to="`/products/${product.id}`"
              class="btn btn-secondary flex-1 text-sm text-center"
            >
              View Details
            </router-link>
          </div>

          <!-- Stock Badge -->
          <div v-if="product.stock <= 5 && product.stock > 0" class="mt-2">
            <span class="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">
              Only {{ product.stock }} left
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import wishlistService from '../services/wishlistService';
import { formatCurrency } from '../utils/helpers';

const authStore = useAuthStore();
const products = ref([]);
const loading = ref(false);

onMounted(() => {
  loadWishlist();
});

async function loadWishlist() {
  loading.value = true;
  try {
    const data = await wishlistService.getWishlist();
    products.value = data.products || [];
  } catch (error) {
    console.error('Failed to load wishlist:', error);
  } finally {
    loading.value = false;
  }
}

async function handleRemove(productId) {
  try {
    await wishlistService.removeFromWishlist(productId);
    products.value = products.value.filter(p => p.id !== productId);
  } catch (error) {
    console.error('Failed to remove from wishlist:', error);
    alert('Failed to remove item. Please try again.');
  }
}

async function handleClearAll() {
  if (!confirm('Are you sure you want to clear your entire wishlist?')) {
    return;
  }

  try {
    await wishlistService.clearWishlist();
    products.value = [];
  } catch (error) {
    console.error('Failed to clear wishlist:', error);
    alert('Failed to clear wishlist. Please try again.');
  }
}

function handleAddToCart(product) {
  // TODO: Implement add to cart functionality
  alert(`Adding ${product.title} to cart...`);
}

function getImageUrl(path) {
  if (path.startsWith('http')) {
    return path;
  }
  return `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/${path}`;
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
