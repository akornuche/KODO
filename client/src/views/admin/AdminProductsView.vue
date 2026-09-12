<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">Manage Products</h1>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search products..."
          class="input"
          @input="handleSearch"
        />
        <select v-model="filters.status" class="input" @change="fetchProducts">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select v-model="filters.verified" class="input" @change="fetchProducts">
          <option value="">All Products</option>
          <option value="true">Verified Only</option>
          <option value="false">Unverified Only</option>
        </select>
        <button @click="fetchProducts" class="btn btn-primary">Search</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="mt-4 text-gray-600">Loading products...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-red-50 border border-red-200 text-red-700 py-4 px-6">
      {{ error }}
    </div>

    <!-- Products Table -->
    <div v-else class="card overflow-x-auto">
      <table v-if="products.length > 0" class="min-w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Seller</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Orders</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="border-b hover:bg-gray-50">
            <td class="py-3 px-4">
              <div>
                <p class="font-medium text-gray-900">{{ product.title }}</p>
                <p class="text-xs text-gray-500">ID: {{ product.id.slice(0, 8) }}</p>
              </div>
            </td>
            <td class="py-3 px-4">
              <p class="text-sm text-gray-700">{{ product.seller?.businessName || product.seller?.username }}</p>
            </td>
            <td class="py-3 px-4 font-medium">₦{{ formatCurrency(product.price) }}</td>
            <td class="py-3 px-4">{{ product.stock || 0 }}</td>
            <td class="py-3 px-4">
              <span :class="['badge', getStatusBadgeClass(product.status)]">
                {{ product.status }}
              </span>
            </td>
            <td class="py-3 px-4 text-sm">{{ product._count?.orders || 0 }}</td>
            <td class="py-3 px-4 space-x-2">
              <button @click="handleDelete(product.id)" class="text-red-600 hover:text-red-700 text-sm font-medium">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="text-center py-8 text-gray-500">
        <p>No products found.</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="meta && meta.totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="btn btn-sm"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
      >
        Previous
      </button>
      <span class="text-sm text-gray-600">
        Page {{ currentPage }} of {{ meta.totalPages }}
      </span>
      <button
        @click="currentPage++"
        :disabled="currentPage === meta.totalPages"
        class="btn btn-sm"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage === meta.totalPages }"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { formatCurrency } from '@/utils/helpers';
import api from '@/services/api';

const products = ref([]);
const meta = ref(null);
const loading = ref(false);
const error = ref(null);
const currentPage = ref(1);

const filters = ref({
  search: '',
  status: '',
  verified: '',
});

const fetchProducts = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 20,
      search: filters.value.search,
      status: filters.value.status,
      verified: filters.value.verified,
    });

    const response = await api.get(`/admin/products?${params}`);
    products.value = response.data.products;
    meta.value = response.data.meta;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load products';
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchProducts();
};

const handleDelete = async (productId) => {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const reason = prompt('Enter reason for deletion (optional):');
    await api.delete(`/admin/products/${productId}`, {
      data: { reason: reason || '' },
    });
    await fetchProducts();
    alert('Product deleted successfully');
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete product');
  }
};

const getStatusBadgeClass = (status) => {
  const map = {
    active: 'badge-green',
    inactive: 'badge-gray',
    suspended: 'badge-red',
    draft: 'badge-yellow',
  };
  return map[status] || 'badge-gray';
};

watch(() => currentPage.value, fetchProducts);

onMounted(fetchProducts);
</script>
