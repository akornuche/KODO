<template>
  <router-link
    :to="`/products/${product.id}`"
    class="card hover:shadow-lg transition-shadow"
  >
    <!-- Product Image -->
    <div class="relative h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
      <img
        v-if="product.images && product.images.length"
        :src="getImageUrl(product.images[0])"
        :alt="product.title"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-400"
      >
        No Image
      </div>

      <!-- Condition Badge -->
      <span
        v-if="product.condition"
        class="absolute top-2 right-2 badge badge-primary"
      >
        {{ formatCondition(product.condition) }}
      </span>
    </div>

    <!-- Product Info -->
    <h3 class="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
      {{ product.title }}
    </h3>

    <p class="text-gray-600 text-sm mb-2 line-clamp-2">
      {{ product.description }}
    </p>

    <!-- Price and Rating -->
    <div class="flex justify-between items-center mt-4">
      <span class="text-2xl font-bold text-primary-600">
        {{ formatCurrency(product.price) }}
      </span>

      <div v-if="product.averageRating" class="flex items-center">
        <span class="text-yellow-500 mr-1">★</span>
        <span class="text-sm text-gray-700">
          {{ product.averageRating.toFixed(1) }}
        </span>
        <span class="text-xs text-gray-500 ml-1">
          ({{ product.reviewCount }})
        </span>
      </div>
    </div>

    <!-- Category and Location -->
    <div class="flex gap-2 mt-3">
      <span v-if="product.category" class="badge badge-secondary text-xs">
        {{ product.category }}
      </span>
      <span v-if="product.location" class="badge badge-secondary text-xs">
        📍 {{ product.location }}
      </span>
    </div>
  </router-link>
</template>

<script setup>
import { formatCurrency } from '../utils/helpers';

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
});

const getImageUrl = (imagePath) => {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${imagePath}`;
};

const formatCondition = (condition) => {
  const labels = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };
  return labels[condition] || condition;
};
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
