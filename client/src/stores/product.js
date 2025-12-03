import { defineStore } from 'pinia';
import { productService } from '../services/productService';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    currentProduct: null,
    facets: null,
    filters: {
      search: '',
      category: '',
      minPrice: null,
      maxPrice: null,
      condition: '',
      tags: [],
      location: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      pages: 0,
    },
    loading: false,
    error: null,
  }),

  getters: {
    filteredProducts: (state) => state.products,
    hasFilters: (state) => {
      return !!(
        state.filters.search ||
        state.filters.category ||
        state.filters.minPrice ||
        state.filters.maxPrice ||
        state.filters.condition ||
        state.filters.tags.length ||
        state.filters.location
      );
    },
  },

  actions: {
    async fetchProducts(resetPage = false) {
      if (resetPage) {
        this.pagination.page = 1;
      }

      this.loading = true;
      this.error = null;

      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          sortBy: this.filters.sortBy,
          sortOrder: this.filters.sortOrder,
        };

        // Add filters
        if (this.filters.search) params.search = this.filters.search;
        if (this.filters.category) params.category = this.filters.category;
        if (this.filters.minPrice) params.minPrice = this.filters.minPrice;
        if (this.filters.maxPrice) params.maxPrice = this.filters.maxPrice;
        if (this.filters.condition) params.condition = this.filters.condition;
        if (this.filters.tags.length) params.tags = this.filters.tags.join(',');
        if (this.filters.location) params.location = this.filters.location;

        const data = await productService.getProducts(params);

        this.products = data.products;
        this.facets = data.facets;
        
        if (data.pagination) {
          this.pagination = { ...this.pagination, ...data.pagination };
        }

        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch products';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async searchProducts(query) {
      this.loading = true;
      this.error = null;

      try {
        const params = {
          q: query,
          page: this.pagination.page,
          limit: this.pagination.limit,
        };

        const data = await productService.searchProducts(params);
        this.products = data.products;
        
        if (data.pagination) {
          this.pagination = { ...this.pagination, ...data.pagination };
        }

        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Search failed';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async fetchProduct(id) {
      this.loading = true;
      this.error = null;

      try {
        this.currentProduct = await productService.getProduct(id);
        return { success: true };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch product';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async createProduct(productData) {
      this.loading = true;
      this.error = null;

      try {
        const product = await productService.createProduct(productData);
        this.products.unshift(product);
        return { success: true, product };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to create product';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async updateProduct(id, productData) {
      this.loading = true;
      this.error = null;

      try {
        const product = await productService.updateProduct(id, productData);
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
          this.products[index] = product;
        }
        if (this.currentProduct?.id === id) {
          this.currentProduct = product;
        }
        return { success: true, product };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to update product';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    async uploadProductImages(id, files) {
      this.loading = true;
      this.error = null;

      try {
        const result = await productService.uploadImages(id, files);
        // Refresh the product data to get updated images
        await this.fetchProduct(id);
        return { success: true, result };
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to upload images';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },

    setFilter(key, value) {
      this.filters[key] = value;
    },

    clearFilters() {
      this.filters = {
        search: '',
        category: '',
        minPrice: null,
        maxPrice: null,
        condition: '',
        tags: [],
        location: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
    },

    setPage(page) {
      this.pagination.page = page;
      this.fetchProducts();
    },

    clearError() {
      this.error = null;
    },
  },
});
