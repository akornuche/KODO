<template>
  <div class="product-comparison">
    <!-- Header -->
    <div class="comparison-header">
      <h2>Compare Products</h2>
      <button @click="clearComparison" class="btn btn-secondary">
        Clear All
      </button>
    </div>

    <!-- Product Selection -->
    <div class="product-selector" v-if="products.length < 10">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search products to compare..."
        @input="searchProducts"
        class="search-input"
      />
      <div v-if="searchResults.length" class="search-results">
        <div
          v-for="product in searchResults"
          :key="product.id"
          @click="addProduct(product)"
          class="search-result-item"
        >
          <img :src="product.images[0]" :alt="product.name" />
          <span>{{ product.name }}</span>
          <span class="price">${{ product.price }}</span>
        </div>
      </div>
    </div>

    <!-- Comparison Table -->
    <div v-if="products.length >= 2" class="comparison-table-wrapper">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th v-for="product in products" :key="product.id">
              <div class="product-header">
                <button @click="removeProduct(product.id)" class="remove-btn">
                  ×
                </button>
                <img :src="product.images[0]" :alt="product.name" />
                <h4>{{ product.name }}</h4>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="feature-label">Price</td>
            <td v-for="product in products" :key="product.id">
              <span
                :class="{ 'best-value': product.id === comparisonData?.bestPrice }"
              >
                ${{ product.price }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="feature-label">Rating</td>
            <td v-for="product in products" :key="product.id">
              <div
                :class="{ 'best-value': product.id === comparisonData?.bestRating }"
              >
                ⭐ {{ product.avgRating || 'N/A' }}
              </div>
            </td>
          </tr>
          <tr>
            <td class="feature-label">Condition</td>
            <td v-for="product in products" :key="product.id">
              {{ product.condition }}
            </td>
          </tr>
          <tr>
            <td class="feature-label">Stock</td>
            <td v-for="product in products" :key="product.id">
              {{ product.stockQuantity }} available
            </td>
          </tr>
          <tr>
            <td class="feature-label">Seller</td>
            <td v-for="product in products" :key="product.id">
              {{ product.seller?.name || 'Unknown' }}
            </td>
          </tr>
          <tr>
            <td class="feature-label">Actions</td>
            <td v-for="product in products" :key="product.id">
              <button @click="viewProduct(product.id)" class="btn btn-primary">
                View Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Save Comparison -->
    <div v-if="products.length >= 2" class="save-section">
      <input
        v-model="comparisonName"
        type="text"
        placeholder="Name this comparison (optional)"
        class="input"
      />
      <button @click="saveComparison" class="btn btn-success">
        Save Comparison
      </button>
    </div>

    <!-- Saved Comparisons -->
    <div v-if="savedComparisons.length" class="saved-comparisons">
      <h3>Saved Comparisons</h3>
      <div
        v-for="comparison in savedComparisons"
        :key="comparison.id"
        class="saved-comparison-item"
      >
        <span>{{ comparison.name || 'Unnamed Comparison' }}</span>
        <span class="date">{{ formatDate(comparison.createdAt) }}</span>
        <button @click="loadComparison(comparison)" class="btn btn-sm">
          Load
        </button>
        <button @click="deleteComparison(comparison.id)" class="btn btn-sm btn-danger">
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import comparisonService from '@/services/comparisonService';
import productService from '@/services/productService';
import { useToast } from 'vue-toastification';

const router = useRouter();
const toast = useToast();

const products = ref([]);
const searchQuery = ref('');
const searchResults = ref([]);
const comparisonName = ref('');
const comparisonData = ref(null);
const savedComparisons = ref([]);

const searchProducts = async () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  try {
    const response = await productService.searchProducts({
      query: searchQuery.value,
      limit: 5,
    });
    searchResults.value = response.products || [];
  } catch (error) {
    console.error('Search error:', error);
  }
};

const addProduct = (product) => {
  if (products.value.length >= 10) {
    toast.warning('Maximum 10 products can be compared');
    return;
  }

  if (products.value.find(p => p.id === product.id)) {
    toast.warning('Product already added');
    return;
  }

  products.value.push(product);
  searchQuery.value = '';
  searchResults.value = [];

  if (products.value.length >= 2) {
    compareProducts();
  }
};

const removeProduct = (productId) => {
  products.value = products.value.filter(p => p.id !== productId);
  if (products.value.length >= 2) {
    compareProducts();
  }
};

const clearComparison = () => {
  products.value = [];
  comparisonData.value = null;
  comparisonName.value = '';
};

const compareProducts = async () => {
  try {
    const productIds = products.value.map(p => p.id);
    const response = await comparisonService.compareProducts(productIds);
    comparisonData.value = response;
  } catch (error) {
    console.error('Comparison error:', error);
    toast.error('Failed to compare products');
  }
};

const saveComparison = async () => {
  try {
    const productIds = products.value.map(p => p.id);
    await comparisonService.saveComparison({
      name: comparisonName.value || 'Unnamed Comparison',
      productIds,
    });
    toast.success('Comparison saved successfully');
    loadSavedComparisons();
  } catch (error) {
    console.error('Save error:', error);
    toast.error('Failed to save comparison');
  }
};

const loadSavedComparisons = async () => {
  try {
    const response = await comparisonService.getUserComparisons();
    savedComparisons.value = response.comparisons || [];
  } catch (error) {
    console.error('Load error:', error);
  }
};

const loadComparison = async (comparison) => {
  try {
    // Load products from comparison
    const productIds = comparison.productIds;
    // Fetch full product details
    const productPromises = productIds.map(id => 
      productService.getProductById(id)
    );
    const productResults = await Promise.all(productPromises);
    products.value = productResults.map(r => r.product);
    comparisonName.value = comparison.name;
    compareProducts();
  } catch (error) {
    console.error('Load comparison error:', error);
    toast.error('Failed to load comparison');
  }
};

const deleteComparison = async (comparisonId) => {
  try {
    await comparisonService.deleteComparison(comparisonId);
    toast.success('Comparison deleted');
    loadSavedComparisons();
  } catch (error) {
    console.error('Delete error:', error);
    toast.error('Failed to delete comparison');
  }
};

const viewProduct = (productId) => {
  router.push(`/products/${productId}`);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

onMounted(() => {
  loadSavedComparisons();
});
</script>

<style scoped>
.product-comparison {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.product-selector {
  margin-bottom: 2rem;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.comparison-table-wrapper {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.comparison-table th,
.comparison-table td {
  padding: 1rem;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.product-header {
  position: relative;
}

.product-header img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}

.feature-label {
  font-weight: 600;
  text-align: left;
  background: #f8f9fa;
}

.best-value {
  color: #4CAF50;
  font-weight: 700;
}

.save-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.save-section input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.saved-comparisons {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px solid #e0e0e0;
}

.saved-comparison-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.saved-comparison-item .date {
  color: #666;
  font-size: 0.875rem;
  margin-left: auto;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
</style>
