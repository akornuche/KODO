<template>
  <div class="advanced-search">
    <div class="search-header">
      <div class="search-bar-container">
        <div class="search-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            @input="handleSearchInput"
            @keyup.enter="performSearch"
            type="text"
            placeholder="Search products, sellers, categories..."
            class="search-input"
          />
          <button v-if="searchQuery" @click="clearSearch" class="clear-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <button @click="toggleFilters" class="filter-toggle-btn" :class="{ active: showFilters }">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
          <span v-if="activeFiltersCount > 0" class="filter-count">{{ activeFiltersCount }}</span>
        </button>
        
        <button @click="performSearch" class="search-btn">
          Search
        </button>
      </div>

      <!-- Search Suggestions -->
      <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          @click="selectSuggestion(suggestion)"
          class="suggestion-item"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span>{{ suggestion.text }}</span>
          <span v-if="suggestion.category" class="suggestion-category">in {{ suggestion.category }}</span>
        </div>
      </div>
    </div>

    <!-- Advanced Filters Panel -->
    <transition name="slide-down">
      <div v-if="showFilters" class="filters-panel">
        <div class="filters-header">
          <h3>Filters</h3>
          <button @click="resetFilters" class="reset-filters-btn">Reset All</button>
        </div>

        <div class="filters-grid">
          <!-- Category Filter -->
          <div class="filter-group">
            <label class="filter-label">Category</label>
            <select v-model="filters.category" class="filter-select">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- Price Range Filter -->
          <div class="filter-group">
            <label class="filter-label">Price Range</label>
            <div class="price-inputs">
              <input
                v-model.number="filters.minPrice"
                type="number"
                placeholder="Min"
                class="price-input"
                min="0"
              />
              <span class="price-separator">-</span>
              <input
                v-model.number="filters.maxPrice"
                type="number"
                placeholder="Max"
                class="price-input"
                min="0"
              />
            </div>
          </div>

          <!-- Location Filter -->
          <div class="filter-group">
            <label class="filter-label">Location</label>
            <input
              v-model="filters.location"
              type="text"
              placeholder="City or region"
              class="filter-input"
            />
          </div>

          <!-- Distance Filter -->
          <div class="filter-group">
            <label class="filter-label">Distance (km)</label>
            <select v-model="filters.distance" class="filter-select">
              <option value="">Any distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
            </select>
          </div>

          <!-- Condition Filter -->
          <div class="filter-group">
            <label class="filter-label">Condition</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.conditions" value="new" />
                <span>New</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.conditions" value="used" />
                <span>Used - Like New</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.conditions" value="good" />
                <span>Used - Good</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.conditions" value="fair" />
                <span>Used - Fair</span>
              </label>
            </div>
          </div>

          <!-- Seller Rating Filter -->
          <div class="filter-group">
            <label class="filter-label">Minimum Seller Rating</label>
            <div class="rating-filter">
              <div class="rating-stars">
                <span
                  v-for="star in 5"
                  :key="star"
                  @click="filters.minRating = star"
                  :class="['star', { active: star <= filters.minRating }]"
                >
                  ★
                </span>
              </div>
              <span class="rating-text">{{ filters.minRating }} stars & up</span>
            </div>
          </div>

          <!-- Delivery Options Filter -->
          <div class="filter-group">
            <label class="filter-label">Delivery Options</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.hasDelivery" />
                <span>Offers Delivery</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.hasPickup" />
                <span>Local Pickup</span>
              </label>
            </div>
          </div>

          <!-- Sort By Filter -->
          <div class="filter-group">
            <label class="filter-label">Sort By</label>
            <select v-model="filters.sortBy" class="filter-select">
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="rating_desc">Highest Rated</option>
              <option value="distance_asc">Nearest First</option>
            </select>
          </div>
        </div>

        <div class="filters-actions">
          <button @click="applyFilters" class="btn-primary">Apply Filters</button>
          <button @click="saveSearch" class="btn-secondary">Save Search</button>
        </div>
      </div>
    </transition>

    <!-- Active Filters Tags -->
    <div v-if="activeFilterTags.length > 0" class="active-filters">
      <span class="active-filters-label">Active Filters:</span>
      <div class="filter-tags">
        <span
          v-for="tag in activeFilterTags"
          :key="tag.key"
          class="filter-tag"
        >
          {{ tag.label }}
          <button @click="removeFilter(tag.key)" class="remove-filter-btn">×</button>
        </span>
      </div>
    </div>

    <!-- Search Results -->
    <div class="search-results">
      <div class="results-header">
        <h2>{{ resultsCount }} Results</h2>
        <div class="view-toggle">
          <button
            @click="viewMode = 'grid'"
            :class="['view-btn', { active: viewMode === 'grid' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            :class="['view-btn', { active: viewMode === 'list' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Searching...</p>
      </div>

      <!-- Results Grid/List -->
      <div v-else-if="results.length > 0" :class="['results-container', `view-${viewMode}`]">
        <div v-for="product in results" :key="product.id" class="product-card">
          <img :src="product.image || '/placeholder.png'" :alt="product.name" class="product-image" />
          <div class="product-details">
            <h3 class="product-title">{{ product.name }}</h3>
            <p class="product-price">${{ product.price.toFixed(2) }}</p>
            <p class="product-location">📍 {{ product.location }}</p>
            <div class="product-meta">
              <span class="product-condition">{{ product.condition }}</span>
              <span class="product-rating">★ {{ product.rating || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <h3>No results found</h3>
        <p>Try adjusting your filters or search terms</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          Previous
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Saved Searches Sidebar (optional) -->
    <div v-if="savedSearches.length > 0" class="saved-searches">
      <h4>Saved Searches</h4>
      <div
        v-for="search in savedSearches"
        :key="search.id"
        @click="loadSavedSearch(search)"
        class="saved-search-item"
      >
        <span>{{ search.name }}</span>
        <button @click.stop="deleteSavedSearch(search.id)" class="delete-btn">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { debounce } from 'lodash';
import api from '../services/api';

export default {
  name: 'AdvancedSearch',
  
  setup() {
    const searchQuery = ref('');
    const showFilters = ref(false);
    const showSuggestions = ref(false);
    const loading = ref(false);
    const viewMode = ref('grid');
    
    const filters = ref({
      category: '',
      minPrice: null,
      maxPrice: null,
      location: '',
      distance: '',
      conditions: [],
      minRating: 0,
      hasDelivery: false,
      hasPickup: false,
      sortBy: 'relevance',
    });

    const categories = ref([
      { value: 'electronics', label: 'Electronics' },
      { value: 'fashion', label: 'Fashion & Apparel' },
      { value: 'home', label: 'Home & Garden' },
      { value: 'sports', label: 'Sports & Outdoors' },
      { value: 'books', label: 'Books & Media' },
      { value: 'toys', label: 'Toys & Games' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'other', label: 'Other' },
    ]);

    const suggestions = ref([]);
    const results = ref([]);
    const savedSearches = ref([]);
    
    const currentPage = ref(1);
    const totalPages = ref(1);
    const resultsCount = ref(0);

    const activeFiltersCount = computed(() => {
      let count = 0;
      if (filters.value.category) count++;
      if (filters.value.minPrice || filters.value.maxPrice) count++;
      if (filters.value.location) count++;
      if (filters.value.distance) count++;
      if (filters.value.conditions.length > 0) count++;
      if (filters.value.minRating > 0) count++;
      if (filters.value.hasDelivery || filters.value.hasPickup) count++;
      return count;
    });

    const activeFilterTags = computed(() => {
      const tags = [];
      
      if (filters.value.category) {
        const cat = categories.value.find(c => c.value === filters.value.category);
        tags.push({ key: 'category', label: cat?.label || filters.value.category });
      }
      
      if (filters.value.minPrice || filters.value.maxPrice) {
        const priceLabel = `$${filters.value.minPrice || 0} - $${filters.value.maxPrice || '∞'}`;
        tags.push({ key: 'price', label: priceLabel });
      }
      
      if (filters.value.location) {
        tags.push({ key: 'location', label: filters.value.location });
      }
      
      if (filters.value.distance) {
        tags.push({ key: 'distance', label: `Within ${filters.value.distance} km` });
      }
      
      filters.value.conditions.forEach(condition => {
        tags.push({ key: `condition_${condition}`, label: condition });
      });
      
      if (filters.value.minRating > 0) {
        tags.push({ key: 'rating', label: `${filters.value.minRating}★ & up` });
      }
      
      if (filters.value.hasDelivery) {
        tags.push({ key: 'delivery', label: 'Has Delivery' });
      }
      
      if (filters.value.hasPickup) {
        tags.push({ key: 'pickup', label: 'Local Pickup' });
      }
      
      return tags;
    });

    const handleSearchInput = debounce(async () => {
      if (searchQuery.value.length < 2) {
        suggestions.value = [];
        showSuggestions.value = false;
        return;
      }

      try {
        const response = await api.get('/search/suggestions', {
          params: { q: searchQuery.value }
        });
        suggestions.value = response.data.suggestions || [];
        showSuggestions.value = true;
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    }, 300);

    const performSearch = async (page = 1) => {
      if (!searchQuery.value && activeFiltersCount.value === 0) return;

      loading.value = true;
      currentPage.value = page;

      try {
        const params = {
          q: searchQuery.value,
          page,
          limit: 20,
          ...filters.value,
          conditions: filters.value.conditions.join(','),
        };

        const response = await api.get('/search', { params });
        
        results.value = response.data.results || [];
        resultsCount.value = response.data.total || 0;
        totalPages.value = Math.ceil(resultsCount.value / 20);
      } catch (error) {
        console.error('Search failed:', error);
        results.value = [];
      } finally {
        loading.value = false;
        showSuggestions.value = false;
      }
    };

    const selectSuggestion = (suggestion) => {
      searchQuery.value = suggestion.text;
      if (suggestion.category) {
        filters.value.category = suggestion.category;
      }
      showSuggestions.value = false;
      performSearch();
    };

    const toggleFilters = () => {
      showFilters.value = !showFilters.value;
    };

    const applyFilters = () => {
      performSearch(1);
    };

    const resetFilters = () => {
      filters.value = {
        category: '',
        minPrice: null,
        maxPrice: null,
        location: '',
        distance: '',
        conditions: [],
        minRating: 0,
        hasDelivery: false,
        hasPickup: false,
        sortBy: 'relevance',
      };
      performSearch(1);
    };

    const removeFilter = (key) => {
      if (key === 'category') filters.value.category = '';
      else if (key === 'price') {
        filters.value.minPrice = null;
        filters.value.maxPrice = null;
      }
      else if (key === 'location') filters.value.location = '';
      else if (key === 'distance') filters.value.distance = '';
      else if (key.startsWith('condition_')) {
        const condition = key.replace('condition_', '');
        filters.value.conditions = filters.value.conditions.filter(c => c !== condition);
      }
      else if (key === 'rating') filters.value.minRating = 0;
      else if (key === 'delivery') filters.value.hasDelivery = false;
      else if (key === 'pickup') filters.value.hasPickup = false;
      
      performSearch(1);
    };

    const clearSearch = () => {
      searchQuery.value = '';
      suggestions.value = [];
      showSuggestions.value = false;
    };

    const changePage = (page) => {
      if (page < 1 || page > totalPages.value) return;
      performSearch(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const saveSearch = async () => {
      const name = prompt('Enter a name for this search:');
      if (!name) return;

      try {
        await api.post('/search/save', {
          name,
          query: searchQuery.value,
          filters: filters.value,
        });
        
        await fetchSavedSearches();
        alert('Search saved successfully!');
      } catch (error) {
        console.error('Failed to save search:', error);
        alert('Failed to save search');
      }
    };

    const fetchSavedSearches = async () => {
      try {
        const response = await api.get('/search/saved');
        savedSearches.value = response.data.searches || [];
      } catch (error) {
        console.error('Failed to fetch saved searches:', error);
      }
    };

    const loadSavedSearch = (search) => {
      searchQuery.value = search.query;
      filters.value = { ...search.filters };
      performSearch(1);
    };

    const deleteSavedSearch = async (id) => {
      try {
        await api.delete(`/search/saved/${id}`);
        await fetchSavedSearches();
      } catch (error) {
        console.error('Failed to delete saved search:', error);
      }
    };

    // Close suggestions when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-bar-container')) {
        showSuggestions.value = false;
      }
    };

    // Fetch saved searches on mount
    fetchSavedSearches();
    
    // Add click outside listener
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleClickOutside);
    }

    return {
      searchQuery,
      showFilters,
      showSuggestions,
      loading,
      viewMode,
      filters,
      categories,
      suggestions,
      results,
      savedSearches,
      currentPage,
      totalPages,
      resultsCount,
      activeFiltersCount,
      activeFilterTags,
      handleSearchInput,
      performSearch,
      selectSuggestion,
      toggleFilters,
      applyFilters,
      resetFilters,
      removeFilter,
      clearSearch,
      changePage,
      saveSearch,
      loadSavedSearch,
      deleteSavedSearch,
    };
  },
};
</script>

<style scoped>
.advanced-search {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.search-header {
  position: relative;
  margin-bottom: 20px;
}

.search-bar-container {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 15px;
  color: #6c757d;
}

.search-input {
  width: 100%;
  padding: 12px 45px 12px 45px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
}

.clear-btn {
  position: absolute;
  right: 15px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 5px;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}

.clear-btn:hover {
  color: #dc3545;
}

.filter-toggle-btn {
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  position: relative;
}

.filter-toggle-btn.active {
  border-color: #007bff;
  color: #007bff;
}

.filter-toggle-btn:hover {
  border-color: #007bff;
}

.filter-count {
  background: #007bff;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  min-width: 20px;
  text-align: center;
}

.search-btn {
  padding: 12px 30px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #0056b3;
}

/* Suggestions Dropdown */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 140px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-top: 5px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: #f8f9fa;
}

.suggestion-category {
  margin-left: auto;
  font-size: 12px;
  color: #6c757d;
}

/* Filters Panel */
.filters-panel {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-header h3 {
  margin: 0;
  font-size: 20px;
}

.reset-filters-btn {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
}

.reset-filters-btn:hover {
  color: #0056b3;
  text-decoration: underline;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.filter-select,
.filter-input {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #007bff;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.price-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.price-separator {
  color: #6c757d;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.rating-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s;
}

.star.active {
  color: #ffc107;
}

.rating-text {
  font-size: 12px;
  color: #6c757d;
}

.filters-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-primary {
  padding: 10px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  padding: 10px 24px;
  background: white;
  color: #007bff;
  border: 2px solid #007bff;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #007bff;
  color: white;
}

/* Active Filters Tags */
.active-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.active-filters-label {
  font-weight: 600;
  font-size: 14px;
  color: #495057;
}

.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e7f3ff;
  border: 1px solid #007bff;
  border-radius: 20px;
  font-size: 13px;
  color: #007bff;
}

.remove-filter-btn {
  background: none;
  border: none;
  color: #007bff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
}

.remove-filter-btn:hover {
  color: #dc3545;
}

/* Search Results */
.search-results {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-header h2 {
  margin: 0;
  font-size: 22px;
}

.view-toggle {
  display: flex;
  gap: 5px;
}

.view-btn {
  padding: 8px;
  border: 1px solid #e9ecef;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.view-btn.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results-container {
  display: grid;
  gap: 20px;
  margin-bottom: 30px;
}

.results-container.view-grid {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.results-container.view-list {
  grid-template-columns: 1fr;
}

.product-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s;
  cursor: pointer;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.view-list .product-card {
  display: flex;
}

.view-list .product-image {
  width: 200px;
  height: 150px;
}

.product-details {
  padding: 15px;
}

.product-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.product-price {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #007bff;
  font-weight: 700;
}

.product-location {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #6c757d;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.product-condition {
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.product-rating {
  color: #ffc107;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6c757d;
}

/* Saved Searches */
.saved-searches {
  position: fixed;
  right: 20px;
  top: 100px;
  width: 250px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.saved-searches h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
}

.saved-search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 5px;
}

.saved-search-item:hover {
  background: #f8f9fa;
}

.delete-btn {
  background: none;
  border: none;
  color: #6c757d;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
}

.delete-btn:hover {
  color: #dc3545;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (max-width: 768px) {
  .search-bar-container {
    flex-direction: column;
  }

  .filter-toggle-btn,
  .search-btn {
    width: 100%;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .results-container.view-grid {
    grid-template-columns: 1fr;
  }

  .saved-searches {
    display: none;
  }
}
</style>
