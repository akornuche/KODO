<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
      <p class="text-gray-600 mb-8">Find answers to common questions</p>

      <!-- Search -->
      <div class="mb-8">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          type="text"
          placeholder="Search FAQs..."
          class="input max-w-2xl"
        />
      </div>

      <!-- Categories -->
      <div v-if="!searchQuery && categories.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="category in categories"
          :key="category.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer"
          @click="selectCategory(category)"
        >
          <h3 class="font-semibold text-gray-900 mb-2">{{ category.name }}</h3>
          <p class="text-sm text-gray-600 mb-3">{{ category.description }}</p>
          <p class="text-sm text-primary-600">{{ category.articleCount || 0 }} articles</p>
        </div>
      </div>

      <!-- Search Results -->
      <div v-else-if="searchQuery" class="space-y-4">
        <div v-if="searching" class="text-center py-8">
          <p class="text-gray-500">Searching...</p>
        </div>
        <div v-else-if="searchResults.length === 0" class="text-center py-8">
          <p class="text-gray-500">No results found for "{{ searchQuery }}"</p>
        </div>
        <div v-else>
          <div v-for="article in searchResults" :key="article.id" class="card">
            <h3 class="font-semibold text-gray-900 mb-2">{{ article.title }}</h3>
            <p class="text-sm text-gray-600">{{ article.excerpt }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import faqService from '../services/faqService';

const categories = ref([]);
const searchQuery = ref('');
const searchResults = ref([]);
const searching = ref(false);

onMounted(() => {
  loadCategories();
});

async function loadCategories() {
  try {
    const data = await faqService.getCategories();
    categories.value = data.categories || [];
  } catch (error) {
    console.error('Failed to load FAQ categories:', error);
  }
}

let searchTimeout;
async function handleSearch() {
  clearTimeout(searchTimeout);
  
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  searching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const data = await faqService.search(searchQuery.value);
      searchResults.value = data.articles || [];
    } catch (error) {
      console.error('Failed to search FAQs:', error);
    } finally {
      searching.value = false;
    }
  }, 300);
}

function selectCategory(category) {
  alert(`Viewing category: ${category.name}\n\nThis will show all articles in this category.`);
}
</script>
