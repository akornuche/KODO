<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Products</h1>
          <p class="text-gray-600 mt-1">
            {{ productStore.pagination.total }} products found
          </p>
        </div>
        <router-link
          v-if="authStore.isSeller"
          to="/products/create"
          class="btn btn-primary"
        >
          + Add Product
        </router-link>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          @input="debouncedSearch"
          type="text"
          placeholder="Search products..."
          class="input max-w-md"
        />
      </div>

      <div class="flex gap-6">
        <!-- Filters Sidebar -->
        <aside class="w-64 flex-shrink-0">
          <div class="card sticky top-4">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-semibold">Filters</h2>
              <button
                v-if="productStore.hasFilters"
                @click="clearFilters"
                class="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear All
              </button>
            </div>

            <div class="space-y-6">
              <!-- Category Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  v-model="productStore.filters.category"
                  @change="applyFilters"
                  class="input"
                >
                  <option value="">All Categories</option>
                  <option
                    v-for="cat in categories"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </option>
                </select>
              </div>

              <!-- Price Range -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div class="flex gap-2">
                  <input
                    v-model.number="productStore.filters.minPrice"
                    @change="applyFilters"
                    type="number"
                    placeholder="Min"
                    class="input"
                  />
                  <input
                    v-model.number="productStore.filters.maxPrice"
                    @change="applyFilters"
                    type="number"
                    placeholder="Max"
                    class="input"
                  />
                </div>
              </div>

              <!-- Condition Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <select
                  v-model="productStore.filters.condition"
                  @change="applyFilters"
                  class="input"
                >
                  <option value="">Any Condition</option>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <!-- Location Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  v-model="productStore.filters.location"
                  @change="applyFilters"
                  type="text"
                  placeholder="City or ZIP"
                  class="input"
                />
              </div>

              <!-- Sort By -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  v-model="productStore.filters.sortBy"
                  @change="applyFilters"
                  class="input"
                >
                  <option value="createdAt">Newest</option>
                  <option value="price">Price</option>
                  <option value="title">Name</option>
                  <option value="averageRating">Rating</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        <!-- Product Grid -->
        <main class="flex-1">
          <!-- Loading State -->
          <div v-if="productStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="card animate-pulse">
              <div class="bg-gray-300 h-48 rounded mb-4"></div>
              <div class="bg-gray-300 h-4 rounded mb-2"></div>
              <div class="bg-gray-300 h-4 rounded w-2/3"></div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="productStore.error" class="card bg-red-50 border-red-200">
            <p class="text-red-700">{{ productStore.error }}</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="!productStore.products.length" class="card text-center py-12">
            <p class="text-gray-600 text-lg">No products found</p>
            <p class="text-gray-500 mt-2">Try adjusting your filters</p>
          </div>

          <!-- Product Grid -->
          <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProductCard
                v-for="product in productStore.products"
                :key="product.id"
                :product="product"
              />
            </div>

            <!-- Pagination -->
            <div v-if="productStore.pagination.pages > 1" class="mt-8 flex justify-center gap-2">
              <button
                v-for="page in productStore.pagination.pages"
                :key="page"
                @click="productStore.setPage(page)"
                :class="[
                  'px-4 py-2 rounded-lg font-medium',
                  page === productStore.pagination.page
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                ]"
              >
                {{ page }}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProductStore } from '../../stores/product';
import { useAuthStore } from '../../stores/auth';
import { debounce } from '../../utils/helpers';
import ProductCard from '../../components/ProductCard.vue';
import { useCategorySEO } from '../../composables/useSEO';
import { useBreadcrumbs } from '../../composables/useBreadcrumbs';

const route = useRoute();
const productStore = useProductStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const category = computed(() => route.query.category || productStore.filters.category || null);
const productCount = computed(() => productStore.pagination.total || 0);

// SEO Enhancement
useCategorySEO(category, productCount);

// Breadcrumb Navigation
watch(category, (newCategory) => {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' }
  ];
  
  if (newCategory) {
    breadcrumbs.push({ name: newCategory, url: `/products?category=${encodeURIComponent(newCategory)}` });
  }
  
  useBreadcrumbs(breadcrumbs);
}, { immediate: true });
const categories = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Books',
  'Toys',
  'Automotive',
  'Other'
];

const debouncedSearch = debounce(() => {
  productStore.setFilter('search', searchQuery.value);
  applyFilters();
}, 500);

const applyFilters = () => {
  productStore.fetchProducts(true);
};

const clearFilters = () => {
  searchQuery.value = '';
  productStore.clearFilters();
  productStore.fetchProducts(true);
};

onMounted(() => {
  productStore.fetchProducts();
});
</script>
