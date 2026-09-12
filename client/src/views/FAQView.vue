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

      <!-- Categories and answers -->
      <div v-if="!searchQuery" class="space-y-8">
        <div v-if="categories.length > 0" class="space-y-8">
          <section v-for="category in categories" :key="category.id" class="card">
            <div class="mb-4">
              <h2 class="text-xl font-semibold text-gray-900">{{ category.name }}</h2>
              <p v-if="category.description" class="text-sm text-gray-600 mt-1">{{ category.description }}</p>
              <p class="text-sm text-primary-600 mt-2">
                {{ category.articles?.length ?? category.articleCount ?? 0 }} questions
              </p>
            </div>

            <div v-if="category.articles?.length" class="space-y-3">
              <details
                v-for="article in category.articles"
                :key="article.id"
                class="border border-gray-200 rounded-lg bg-white"
              >
                <summary class="cursor-pointer px-4 py-3 font-medium text-gray-900">
                  {{ article.title }}
                </summary>
                <p class="px-4 pb-4 text-gray-600 whitespace-pre-line">{{ article.content }}</p>
              </details>
            </div>
          </section>
        </div>

        <div v-else class="text-center py-12 card">
          <p class="text-gray-500">No FAQs are available yet.</p>
        </div>
      </div>

      <!-- Search Results -->
      <div v-else class="space-y-4">
        <div v-if="searching" class="text-center py-8">
          <p class="text-gray-500">Searching...</p>
        </div>
        <div v-else-if="searchResults.length === 0" class="text-center py-8">
          <p class="text-gray-500">No results found for "{{ searchQuery }}"</p>
        </div>
        <div v-else class="space-y-4">
          <article v-for="article in searchResults" :key="article.id" class="card">
            <h3 class="font-semibold text-gray-900 mb-2">{{ article.title }}</h3>
            <p class="text-gray-600 whitespace-pre-line">{{ article.content }}</p>
          </article>
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
  const query = searchQuery.value.trim();

  if (query.length < 2) {
    searchResults.value = [];
    searching.value = false;
    return;
  }

  searching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const data = await faqService.search(query);
      searchResults.value = data.articles || [];
    } catch (error) {
      console.error('Failed to search FAQs:', error);
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 300);
}
</script>
