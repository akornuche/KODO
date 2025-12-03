<template>
  <div class="home-view">
    <!-- Hero Section -->
    <section class="hero-section bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-5xl md:text-6xl font-bold mb-6">
            Buy, Sell & Deliver Anything in Nigeria
          </h1>
          <p class="text-xl md:text-2xl mb-8 text-primary-50">
            Africa's first marketplace with real-time delivery tracking, secure escrow payments, and instant courier matching
          </p>
          <div class="flex flex-wrap gap-4 justify-center">
            <router-link to="/products" class="btn btn-lg bg-white text-primary-600 hover:bg-primary-50 px-8 py-4 text-lg font-semibold rounded-lg">
              Browse Products
            </router-link>
            <router-link to="/register" class="btn btn-lg border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 text-lg font-semibold rounded-lg">
              Start Selling
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 bg-gray-50">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose KODO?</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="card text-center">
            <div class="text-5xl mb-4">🛡️</div>
            <h3 class="text-xl font-semibold mb-3">Secure Escrow Payments</h3>
            <p class="text-gray-600">Your money is protected until delivery is confirmed. Buy with confidence.</p>
          </div>
          <div class="card text-center">
            <div class="text-5xl mb-4">📍</div>
            <h3 class="text-xl font-semibold mb-3">Real-time GPS Tracking</h3>
            <p class="text-gray-600">Track your delivery live on the map. Know exactly where your package is.</p>
          </div>
          <div class="card text-center">
            <div class="text-5xl mb-4">⚡</div>
            <h3 class="text-xl font-semibold mb-3">Instant Courier Matching</h3>
            <p class="text-gray-600">Couriers bid on your delivery. Choose the best price and rating.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
            <h3 class="text-xl font-semibold mb-2">Browse & Buy</h3>
            <p class="text-gray-600">Find products from verified sellers across Nigeria</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
            <h3 class="text-xl font-semibold mb-2">Couriers Bid</h3>
            <p class="text-gray-600">Multiple couriers compete for your delivery</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
            <h3 class="text-xl font-semibold mb-2">Track & Receive</h3>
            <p class="text-gray-600">Track in real-time and confirm safe delivery</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Trending Products -->
    <section v-if="trendingProducts.length" class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl md:text-4xl font-bold">Trending Now</h2>
          <router-link to="/products" class="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </router-link>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div
            v-for="product in trendingProducts"
            :key="product.id"
            class="cursor-pointer hover:shadow-lg transition-shadow rounded-lg overflow-hidden border border-gray-200"
            @click="router.push(`/products/${product.id}`)"
          >
            <img
              :src="getImageUrl(product.images?.[0] || product.imageUrl)"
              :alt="product.title"
              class="w-full h-40 object-cover"
            />
            <div class="p-4">
              <h3 class="font-semibold text-gray-900 line-clamp-2 mb-2">{{ product.title }}</h3>
              <p class="text-primary-600 font-bold text-lg">{{ formatCurrency(product.price) }}</p>
              <div v-if="product.averageRating" class="flex items-center gap-1 mt-2">
                <span class="text-yellow-500 text-sm">★</span>
                <span class="text-sm text-gray-600">{{ product.averageRating.toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Items -->
    <section v-if="popularProducts.length" class="py-16 bg-gray-50">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl md:text-4xl font-bold">Popular This Week</h2>
          <router-link to="/products" class="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </router-link>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div
            v-for="product in popularProducts"
            :key="product.id"
            class="cursor-pointer hover:shadow-lg transition-shadow rounded-lg overflow-hidden border border-gray-200 bg-white"
            @click="router.push(`/products/${product.id}`)"
          >
            <img
              :src="getImageUrl(product.images?.[0] || product.imageUrl)"
              :alt="product.title"
              class="w-full h-48 object-cover"
            />
            <div class="p-4">
              <h3 class="font-semibold text-gray-900 line-clamp-2 mb-2">{{ product.title }}</h3>
              <p class="text-primary-600 font-bold text-lg">{{ formatCurrency(product.price) }}</p>
              <div v-if="product.averageRating" class="flex items-center gap-1 mt-2">
                <span class="text-yellow-500 text-sm">★</span>
                <span class="text-sm text-gray-600">{{ product.averageRating.toFixed(1) }}</span>
                <span class="text-xs text-gray-500 ml-1">({{ product.reviewCount }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Personalized Recommendations (for logged in users) -->
    <section v-if="authStore.isAuthenticated && recommendedProducts.length" class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl md:text-4xl font-bold">Recommended For You</h2>
          <router-link to="/products" class="text-primary-600 hover:text-primary-700 font-medium">
            View All →
          </router-link>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div
            v-for="product in recommendedProducts"
            :key="product.id"
            class="cursor-pointer hover:shadow-lg transition-shadow rounded-lg overflow-hidden border border-gray-200"
            @click="router.push(`/products/${product.id}`)"
          >
            <img
              :src="getImageUrl(product.images?.[0] || product.imageUrl)"
              :alt="product.title"
              class="w-full h-40 object-cover"
            />
            <div class="p-4">
              <h3 class="font-semibold text-gray-900 line-clamp-2 mb-2">{{ product.title }}</h3>
              <p class="text-primary-600 font-bold text-lg">{{ formatCurrency(product.price) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 bg-primary-50">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p class="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
          Join thousands of buyers, sellers, and couriers on Nigeria's most trusted marketplace
        </p>
        <router-link to="/register" class="btn btn-primary btn-lg px-8 py-4 text-lg font-semibold rounded-lg inline-block">
          Create Free Account
        </router-link>
        <p class="mt-6 text-gray-600">
          Already have an account?
          <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </router-link>
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSEO } from '@/composables/useSEO';
import recommendationService from '@/services/recommendationService';
import { formatCurrency } from '@/utils/helpers';

const router = useRouter();
const authStore = useAuthStore();

// Recommendation products
const trendingProducts = ref([]);
const popularProducts = ref([]);
const recommendedProducts = ref([]);

// Get image URL helper
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${imagePath}`;
};

// Fetch product recommendations
const fetchRecommendations = async () => {
  try {
    // For now, fetch general recommendations
    // In production, you'd have endpoints for trending/popular
    if (authStore.isAuthenticated) {
      const data = await recommendationService.getRecommendations(10);
      trendingProducts.value = data.products?.slice(0, 5) || [];
      popularProducts.value = data.products?.slice(5, 9) || [];
      
      // Get personalized recommendations
      const personalData = await recommendationService.getRecommendationsBasedOnHistory(5);
      recommendedProducts.value = personalData.products || [];
    } else {
      // For non-authenticated users, just show general recommendations
      const data = await recommendationService.getRecommendations(14);
      trendingProducts.value = data.products?.slice(0, 5) || [];
      popularProducts.value = data.products?.slice(5, 9) || [];
    }
  } catch (err) {
    console.error('Failed to load recommendations:', err);
  }
};

onMounted(() => {
  fetchRecommendations();
});

// Comprehensive homepage SEO
useSEO({
  title: 'KODO - Buy, Sell & Deliver with Real-time Tracking in Nigeria',
  description: 'Nigeria\'s leading marketplace with secure escrow payments, real-time GPS delivery tracking, and instant courier matching. Shop electronics, fashion, home goods and more with confidence.',
  keywords: [
    'marketplace Nigeria',
    'online shopping Nigeria',
    'delivery tracking',
    'secure payments',
    'courier services Nigeria',
    'e-commerce Nigeria',
    'buy and sell online',
    'Lagos marketplace',
    'Abuja shopping',
    'Port Harcourt delivery'
  ],
  url: '/',
  type: 'website',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'KODO Marketplace',
    alternateName: 'KODO',
    url: 'https://kodo.com',
    description: 'Buy, sell and deliver goods with real-time tracking and secure payments across Nigeria',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://kodo.com/products?search={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'KODO',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kodo.com/og-image.png'
      }
    }
  }
});
</script>

<style scoped>
.hero-section {
  min-height: 500px;
  display: flex;
  align-items: center;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .hero-section h1 {
    font-size: 2.5rem;
  }
  
  .hero-section p {
    font-size: 1.125rem;
  }
}
</style>
