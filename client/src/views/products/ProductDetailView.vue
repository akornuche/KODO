<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="animate-pulse">
        <div class="bg-gray-300 h-96 rounded-lg mb-6"></div>
        <div class="bg-gray-300 h-8 rounded mb-4"></div>
        <div class="bg-gray-300 h-4 rounded w-2/3"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card bg-red-50 border-red-200">
        <p class="text-red-700">{{ error }}</p>
        <router-link to="/products" class="btn btn-primary mt-4">
          Back to Products
        </router-link>
      </div>

      <!-- Product Details -->
      <div v-else-if="product" class="grid md:grid-cols-2 gap-8">
        <!-- Image Gallery -->
        <div>
          <div class="card p-0 overflow-hidden">
            <img
              :src="currentImage"
              :alt="product.title"
              class="w-full h-96 object-contain bg-gray-100"
            />
          </div>

          <!-- Thumbnail Gallery -->
          <div v-if="product.images && product.images.length > 1" class="grid grid-cols-5 gap-2 mt-4">
            <button
              v-for="(image, index) in product.images"
              :key="index"
              @click="currentImageIndex = index"
              :class="[
                'border-2 rounded-lg overflow-hidden',
                currentImageIndex === index
                  ? 'border-primary-600'
                  : 'border-gray-300'
              ]"
            >
              <img
                :src="getImageUrl(image)"
                :alt="`${product.title} ${index + 1}`"
                class="w-full h-20 object-cover"
              />
            </button>
          </div>
        </div>

        <!-- Product Info -->
        <div>
          <div class="card">
            <!-- Title and Price -->
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              {{ product.title }}
            </h1>

            <div class="flex items-baseline gap-4 mb-4">
              <span class="text-4xl font-bold text-primary-600">
                {{ formatCurrency(product.price) }}
              </span>
              <span v-if="product.condition" class="badge badge-primary">
                {{ formatCondition(product.condition) }}
              </span>
            </div>

            <!-- Rating -->
            <div v-if="product.averageRating" class="flex items-center mb-4">
              <div class="flex text-yellow-500 text-xl">
                <span v-for="i in 5" :key="i">
                  {{ i <= Math.round(product.averageRating) ? '★' : '☆' }}
                </span>
              </div>
              <span class="ml-2 text-gray-700">
                {{ product.averageRating.toFixed(1) }}
              </span>
              <span class="text-gray-500 ml-1">
                ({{ product.reviewCount }} reviews)
              </span>
            </div>

            <!-- Description -->
            <div class="mb-6">
              <h2 class="text-lg font-semibold mb-2">Description</h2>
              <p class="text-gray-700 whitespace-pre-line">
                {{ product.description }}
              </p>
            </div>

            <!-- Details -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div v-if="product.category">
                <span class="text-sm text-gray-600">Category</span>
                <p class="font-medium">{{ product.category }}</p>
              </div>
              <div v-if="product.location">
                <span class="text-sm text-gray-600">Location</span>
                <p class="font-medium">📍 {{ product.location }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-600">Listed</span>
                <p class="font-medium">{{ formatDate(product.createdAt) }}</p>
              </div>
            </div>

            <!-- Seller Info with Follow Button -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">
                    {{ (product.seller?.username || 'U')[0].toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900">{{ product.seller?.username || 'Unknown Seller' }}</p>
                    <p class="text-sm text-gray-600">
                      {{ sellerStats.totalProducts || 0 }} products • {{ sellerStats.followers || 0 }} followers
                    </p>
                  </div>
                </div>
                <button
                  v-if="authStore.isAuthenticated && authStore.user?.id !== product.sellerId"
                  @click="toggleFollowSeller"
                  :class="[
                    'btn',
                    isFollowing ? 'btn-secondary' : 'btn-primary'
                  ]"
                >
                  {{ isFollowing ? 'Following' : 'Follow' }}
                </button>
              </div>
            </div>

            <!-- Variants Selector -->
            <div v-if="variants.length" class="mb-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Select Options</h3>
              
              <!-- Color Variants -->
              <div v-if="colorVariants.length" class="mb-4">
                <label class="text-sm text-gray-600 mb-2 block">Color</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="variant in colorVariants"
                    :key="variant.id"
                    @click="selectedVariant = variant"
                    :class="[
                      'px-4 py-2 rounded-lg border-2 transition-all',
                      selectedVariant?.id === variant.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    ]"
                  >
                    <span
                      v-if="variant.colorHex"
                      class="inline-block w-4 h-4 rounded-full mr-2 border border-gray-300"
                      :style="{ backgroundColor: variant.colorHex }"
                    ></span>
                    {{ variant.color || variant.name }}
                  </button>
                </div>
              </div>

              <!-- Size Variants -->
              <div v-if="sizeVariants.length" class="mb-4">
                <label class="text-sm text-gray-600 mb-2 block">Size</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="variant in sizeVariants"
                    :key="variant.id"
                    @click="selectedVariant = variant"
                    :class="[
                      'px-4 py-2 rounded-lg border-2 transition-all',
                      selectedVariant?.id === variant.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400',
                      variant.stockQuantity === 0 && 'opacity-50 cursor-not-allowed'
                    ]"
                    :disabled="variant.stockQuantity === 0"
                  >
                    {{ variant.size || variant.name }}
                    <span v-if="variant.stockQuantity === 0" class="text-xs text-red-500 ml-1">
                      Out of stock
                    </span>
                  </button>
                </div>
              </div>

              <!-- Other Variants -->
              <div v-if="otherVariants.length" class="mb-4">
                <label class="text-sm text-gray-600 mb-2 block">Options</label>
                <select
                  v-model="selectedVariant"
                  class="input"
                >
                  <option :value="null">Select option...</option>
                  <option
                    v-for="variant in otherVariants"
                    :key="variant.id"
                    :value="variant"
                  >
                    {{ variant.name }} - {{ formatCurrency(variant.price || product.price) }}
                    {{ variant.stockQuantity === 0 ? '(Out of stock)' : '' }}
                  </option>
                </select>
              </div>

              <!-- Selected Variant Info -->
              <div v-if="selectedVariant" class="bg-primary-50 rounded-lg p-3 mb-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-700">
                    {{ selectedVariant.name }}
                  </span>
                  <span class="font-semibold text-primary-600">
                    {{ formatCurrency(selectedVariant.price || product.price) }}
                  </span>
                </div>
                <div class="text-xs text-gray-600 mt-1">
                  Stock: {{ selectedVariant.stockQuantity }} available
                </div>
              </div>
            </div>

            <!-- Quantity Selector -->
            <div v-if="authStore.isBuyer" class="mb-6">
              <label class="text-sm font-semibold text-gray-700 mb-2 block">Quantity</label>
              <div class="flex items-center gap-3">
                <button
                  @click="quantity = Math.max(1, quantity - 1)"
                  class="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center"
                >
                  -
                </button>
                <input
                  v-model.number="quantity"
                  type="number"
                  min="1"
                  :max="maxQuantity"
                  class="w-20 text-center input"
                />
                <button
                  @click="quantity = Math.min(maxQuantity, quantity + 1)"
                  class="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center"
                >
                  +
                </button>
                <span class="text-sm text-gray-600">
                  {{ maxQuantity }} available
                </span>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="product.tags && product.tags.length" class="mb-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in product.tags"
                  :key="tag"
                  class="badge badge-secondary"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button
                v-if="authStore.isBuyer"
                @click="addToCart"
                class="btn btn-primary flex-1"
                :disabled="maxQuantity === 0"
              >
                {{ maxQuantity === 0 ? 'Out of Stock' : 'Add to Cart' }}
              </button>
              <button
                v-if="authStore.isBuyer"
                @click="contactSeller"
                class="btn btn-outline"
              >
                Contact Seller
              </button>
              <button
                v-if="canEdit"
                @click="editProduct"
                class="btn btn-secondary"
              >
                Edit
              </button>
              <button
                v-if="canEdit"
                @click="deleteProduct"
                class="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations Section -->
      <div v-if="product" class="mt-8 space-y-8">
        <!-- Frequently Bought Together -->
        <div v-if="frequentlyBought.length" class="card">
          <h2 class="text-2xl font-bold mb-6">Frequently Bought Together</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="item in frequentlyBought"
              :key="item.id"
              class="cursor-pointer hover:shadow-lg transition-shadow"
              @click="router.push(`/products/${item.id}`)"
            >
              <img
                :src="getImageUrl(item.images?.[0] || item.imageUrl)"
                :alt="item.title"
                class="w-full h-32 object-cover rounded-lg mb-2"
              />
              <h3 class="font-medium text-sm line-clamp-2 mb-1">{{ item.title }}</h3>
              <p class="text-primary-600 font-semibold">{{ formatCurrency(item.price) }}</p>
            </div>
          </div>
        </div>

        <!-- Similar Products -->
        <div v-if="similarProducts.length" class="card">
          <h2 class="text-2xl font-bold mb-6">Similar Products</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div
              v-for="item in similarProducts"
              :key="item.id"
              class="cursor-pointer hover:shadow-lg transition-shadow"
              @click="router.push(`/products/${item.id}`)"
            >
              <img
                :src="getImageUrl(item.images?.[0] || item.imageUrl)"
                :alt="item.title"
                class="w-full h-32 object-cover rounded-lg mb-2"
              />
              <h3 class="font-medium text-sm line-clamp-2 mb-1">{{ item.title }}</h3>
              <p class="text-primary-600 font-semibold text-sm">{{ formatCurrency(item.price) }}</p>
            </div>
          </div>
        </div>

        <!-- Based on Your History -->
        <div v-if="authStore.isAuthenticated && recommendedProducts.length" class="card">
          <h2 class="text-2xl font-bold mb-6">Based on Your History</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="item in recommendedProducts"
              :key="item.id"
              class="cursor-pointer hover:shadow-lg transition-shadow"
              @click="router.push(`/products/${item.id}`)"
            >
              <img
                :src="getImageUrl(item.images?.[0] || item.imageUrl)"
                :alt="item.title"
                class="w-full h-32 object-cover rounded-lg mb-2"
              />
              <h3 class="font-medium text-sm line-clamp-2 mb-1">{{ item.title }}</h3>
              <p class="text-primary-600 font-semibold">{{ formatCurrency(item.price) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Q&A Section -->
      <div v-if="product" class="mt-8">
        <div class="card">
          <h2 class="text-2xl font-bold mb-6">Questions & Answers</h2>

          <!-- Ask Question Button -->
          <button
            v-if="authStore.isAuthenticated"
            @click="showQuestionForm = !showQuestionForm"
            class="btn btn-primary mb-6"
          >
            Ask a Question
          </button>

          <!-- Question Form -->
          <div v-if="showQuestionForm" class="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 class="font-semibold mb-4">Ask Your Question</h3>
            <form @submit.prevent="submitQuestion">
              <div class="mb-4">
                <textarea
                  v-model="questionForm.question"
                  rows="3"
                  maxlength="500"
                  class="input"
                  placeholder="What would you like to know about this product?"
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">
                  {{ questionForm.question.length }}/500 characters
                </p>
              </div>

              <div class="flex gap-3">
                <button type="submit" class="btn btn-primary">Submit Question</button>
                <button type="button" @click="showQuestionForm = false" class="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Questions List -->
          <div v-if="questions.length" class="space-y-6">
            <div
              v-for="qa in questions"
              :key="qa.id"
              class="border-b border-gray-200 pb-4 last:border-0"
            >
              <!-- Question -->
              <div class="mb-3">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="text-sm font-semibold text-gray-900">Q:</span>
                    <span class="text-gray-800 ml-2">{{ qa.question }}</span>
                  </div>
                  <button
                    @click="markQuestionHelpful(qa.id)"
                    class="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    👍 {{ qa.helpfulCount || 0 }}
                  </button>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 ml-6">
                  <span>{{ qa.user?.username || 'Anonymous' }}</span>
                  <span>•</span>
                  <span>{{ formatRelativeTime(qa.createdAt) }}</span>
                </div>
              </div>

              <!-- Answer -->
              <div v-if="qa.answer" class="ml-6 bg-primary-50 rounded-lg p-3">
                <div class="mb-1">
                  <span class="text-sm font-semibold text-primary-700">A:</span>
                  <span class="text-gray-700 ml-2">{{ qa.answer }}</span>
                </div>
                <div class="text-xs text-gray-600">
                  <span>{{ product.seller?.username || 'Seller' }}</span>
                  <span class="mx-1">•</span>
                  <span>{{ formatRelativeTime(qa.answeredAt) }}</span>
                </div>
              </div>

              <!-- Answer Form (for seller) -->
              <div
                v-else-if="canEdit"
                class="ml-6"
              >
                <button
                  @click="answeringQuestion = qa.id"
                  class="text-sm text-primary-600 hover:text-primary-700"
                >
                  Answer this question
                </button>
                <form
                  v-if="answeringQuestion === qa.id"
                  @submit.prevent="submitAnswer(qa.id)"
                  class="mt-2"
                >
                  <textarea
                    v-model="answerForm.answer"
                    rows="2"
                    maxlength="1000"
                    class="input mb-2"
                    placeholder="Type your answer..."
                  ></textarea>
                  <div class="flex gap-2">
                    <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                    <button
                      type="button"
                      @click="answeringQuestion = null"
                      class="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <p v-else class="text-gray-600 text-center py-8">
            No questions yet. Be the first to ask about this product!
          </p>
        </div>
      </div>

      <!-- Reviews Section -->
      <div v-if="product" class="mt-8">
        <div class="card">
          <h2 class="text-2xl font-bold mb-6">Customer Reviews</h2>
          
          <!-- Add Review Button -->
          <button
            v-if="authStore.isBuyer && !hasReviewed"
            @click="showReviewForm = !showReviewForm"
            class="btn btn-primary mb-6"
          >
            Write a Review
          </button>

          <!-- Review Form -->
          <div v-if="showReviewForm" class="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 class="font-semibold mb-4">Write Your Review</h3>
            <form @submit.prevent="submitReview">
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Rating</label>
                <div class="flex gap-2">
                  <button
                    v-for="i in 5"
                    :key="i"
                    type="button"
                    @click="reviewForm.rating = i"
                    :class="[
                      'text-3xl',
                      i <= reviewForm.rating ? 'text-yellow-500' : 'text-gray-300'
                    ]"
                  >
                    ★
                  </button>
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Comment</label>
                <textarea
                  v-model="reviewForm.comment"
                  rows="4"
                  maxlength="1000"
                  class="input"
                  placeholder="Share your experience..."
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">
                  {{ reviewForm.comment.length }}/1000 characters
                </p>
              </div>

              <div class="flex gap-3">
                <button type="submit" class="btn btn-primary">Submit Review</button>
                <button type="button" @click="showReviewForm = false" class="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Reviews List -->
          <div v-if="reviews.length" class="space-y-4">
            <div
              v-for="review in reviews"
              :key="review.id"
              class="border-b border-gray-200 pb-4 last:border-0"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-semibold">{{ review.user?.username || 'Anonymous' }}</p>
                  <div class="flex text-yellow-500 text-sm">
                    <span v-for="i in 5" :key="i">
                      {{ i <= review.rating ? '★' : '☆' }}
                    </span>
                  </div>
                </div>
                <span class="text-sm text-gray-500">
                  {{ formatRelativeTime(review.createdAt) }}
                </span>
              </div>
              <p class="text-gray-700">{{ review.comment }}</p>
            </div>
          </div>

          <p v-else class="text-gray-600 text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductStore } from '../../stores/product';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { reviewService } from '../../services/productService';
import variantService from '../../services/variantService';
import recommendationService from '../../services/recommendationService';
import productQAService from '../../services/productQAService';
import sellerFollowService from '../../services/sellerFollowService';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/helpers';
import { useProductSEO } from '../../composables/useSEO';
import { useBreadcrumbs } from '../../composables/useBreadcrumbs';

const route = useRoute();
const router = useRouter();
const productStore = useProductStore();
const authStore = useAuthStore();
const cartStore = useCartStore();

const loading = ref(true);
const error = ref(null);
const product = ref(null);
const currentImageIndex = ref(0);
const reviews = ref([]);
const showReviewForm = ref(false);
const hasReviewed = ref(false);

// Variants
const variants = ref([]);
const selectedVariant = ref(null);
const quantity = ref(1);

// Recommendations
const similarProducts = ref([]);
const frequentlyBought = ref([]);
const recommendedProducts = ref([]);

// Q&A
const questions = ref([]);
const showQuestionForm = ref(false);
const answeringQuestion = ref(null);

// Seller Follow
const isFollowing = ref(false);
const sellerStats = ref({
  totalProducts: 0,
  followers: 0,
});

const reviewForm = ref({
  rating: 5,
  comment: '',
});

const questionForm = ref({
  question: '',
});

const answerForm = ref({
  answer: '',
});

// SEO Enhancement
useProductSEO(product);

// Breadcrumb Navigation
const breadcrumbs = computed(() => {
  if (!product.value) {
    return [
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products' },
    ];
  }

  return [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    ...(product.value.category
      ? [{ name: product.value.category, url: `/products?category=${encodeURIComponent(product.value.category)}` }]
      : []),
    { name: product.value.title, url: `/products/${product.value.id}` },
  ];
});

useBreadcrumbs(breadcrumbs);

const currentImage = computed(() => {
  if (!product.value?.images || !product.value.images.length) {
    return 'https://via.placeholder.com/400x400?text=No+Image';
  }
  return getImageUrl(product.value.images[currentImageIndex.value]);
});

const canEdit = computed(() => {
  return (
    authStore.isAuthenticated &&
    (authStore.user?.id === product.value?.sellerId || authStore.isAdmin)
  );
});

// Group variants by type
const colorVariants = computed(() => {
  return variants.value.filter(v => v.color || v.colorHex);
});

const sizeVariants = computed(() => {
  return variants.value.filter(v => v.size && !v.color);
});

const otherVariants = computed(() => {
  return variants.value.filter(v => !v.color && !v.size);
});

// Max quantity based on selected variant or product stock
const maxQuantity = computed(() => {
  if (selectedVariant.value) {
    return selectedVariant.value.stockQuantity || 0;
  }
  return product.value?.stockQuantity || 100;
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

const fetchProduct = async () => {
  loading.value = true;
  error.value = null;

  try {
    const result = await productStore.fetchProduct(route.params.id);
    if (result.success) {
      product.value = productStore.currentProduct;
      // Fetch all related data in parallel
      await Promise.all([
        fetchReviews(),
        fetchVariants(),
        fetchRecommendations(),
        fetchQuestions(),
        checkFollowStatus(),
        fetchSellerStats(),
      ]);
    } else {
      error.value = result.error;
    }
  } catch (err) {
    error.value = 'Failed to load product';
  } finally {
    loading.value = false;
  }
};

const fetchReviews = async () => {
  try {
    const data = await reviewService.getProductReviews(route.params.id);
    reviews.value = data.reviews || [];
    
    // Check if current user has reviewed
    if (authStore.isAuthenticated) {
      hasReviewed.value = reviews.value.some(r => r.userId === authStore.user?.id);
    }
  } catch (err) {
    console.error('Failed to load reviews:', err);
  }
};

const fetchVariants = async () => {
  try {
    const data = await variantService.getProductVariants(route.params.id);
    variants.value = data.variants || [];
  } catch (err) {
    console.error('Failed to load variants:', err);
  }
};

const fetchRecommendations = async () => {
  try {
    // Track product view for recommendations
    if (authStore.isAuthenticated) {
      await recommendationService.trackProductView(route.params.id);
    }

    // Fetch similar products
    const similarData = await recommendationService.getSimilarProducts(route.params.id, 6);
    similarProducts.value = similarData.products || [];

    // Fetch frequently bought together
    const frequentData = await recommendationService.getFrequentlyBoughtTogether(route.params.id, 4);
    frequentlyBought.value = frequentData.products || [];

    // Fetch recommendations based on history
    if (authStore.isAuthenticated) {
      const recommendedData = await recommendationService.getRecommendationsBasedOnHistory(10);
      recommendedProducts.value = recommendedData.products || [];
    }
  } catch (err) {
    console.error('Failed to load recommendations:', err);
  }
};

const fetchQuestions = async () => {
  try {
    const data = await productQAService.getProductQuestions(route.params.id);
    questions.value = data.questions || [];
  } catch (err) {
    console.error('Failed to load questions:', err);
  }
};

const checkFollowStatus = async () => {
  if (!authStore.isAuthenticated || !product.value?.sellerId) return;
  
  try {
    const data = await sellerFollowService.checkIfFollowing(product.value.sellerId);
    isFollowing.value = data.isFollowing || false;
  } catch (err) {
    console.error('Failed to check follow status:', err);
  }
};

const fetchSellerStats = async () => {
  if (!product.value?.sellerId) return;

  try {
    const followersData = await sellerFollowService.getSellerFollowers(product.value.sellerId, 1, 1);
    sellerStats.value.followers = followersData.total || 0;
    // You could also fetch total products from a seller products endpoint
  } catch (err) {
    console.error('Failed to fetch seller stats:', err);
  }
};

const toggleFollowSeller = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    if (isFollowing.value) {
      await sellerFollowService.unfollowSeller(product.value.sellerId);
      isFollowing.value = false;
      sellerStats.value.followers = Math.max(0, sellerStats.value.followers - 1);
    } else {
      await sellerFollowService.followSeller(product.value.sellerId);
      isFollowing.value = true;
      sellerStats.value.followers += 1;
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update follow status');
  }
};

const submitReview = async () => {
  if (!reviewForm.value.rating) {
    alert('Please select a rating');
    return;
  }

  try {
    await reviewService.createReview({
      productId: route.params.id,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
    });

    showReviewForm.value = false;
    reviewForm.value = { rating: 5, comment: '' };
    await fetchProduct(); // Refresh to get updated rating
    await fetchReviews();
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to submit review');
  }
};

const contactSeller = () => {
  if (product.value?.sellerId) {
    router.push(`/chat?user=${product.value.sellerId}`);
  }
};

const submitQuestion = async () => {
  if (!questionForm.value.question.trim()) {
    alert('Please enter a question');
    return;
  }

  try {
    await productQAService.askQuestion(route.params.id, questionForm.value.question);
    showQuestionForm.value = false;
    questionForm.value.question = '';
    await fetchQuestions();
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to submit question');
  }
};

const submitAnswer = async (questionId) => {
  if (!answerForm.value.answer.trim()) {
    alert('Please enter an answer');
    return;
  }

  try {
    await productQAService.answerQuestion(questionId, answerForm.value.answer);
    answeringQuestion.value = null;
    answerForm.value.answer = '';
    await fetchQuestions();
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to submit answer');
  }
};

const markQuestionHelpful = async (questionId) => {
  try {
    await productQAService.markAsHelpful(questionId);
    await fetchQuestions();
  } catch (err) {
    console.error('Failed to mark as helpful:', err);
  }
};

const addToCart = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  if (!authStore.isBuyer) {
    alert('Only buyers can add items to cart');
    return;
  }

  if (maxQuantity.value === 0) {
    alert('This product is out of stock');
    return;
  }

  if (quantity.value > maxQuantity.value) {
    alert(`Only ${maxQuantity.value} items available`);
    return;
  }

  // Add with variant and quantity
  const cartItem = {
    ...product.value,
    quantity: quantity.value,
    selectedVariant: selectedVariant.value,
  };

  cartStore.addItem(cartItem);
  
  // Show success message and option to go to cart
  if (confirm('Product added to cart! Would you like to view your cart?')) {
    router.push('/cart');
  }
};

const editProduct = () => {
  router.push(`/products/${route.params.id}/edit`);
};

const deleteProduct = async () => {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  const result = await productStore.deleteProduct(route.params.id);
  if (result.success) {
    router.push('/products');
  } else {
    alert(result.error);
  }
};

onMounted(() => {
  fetchProduct();
});
</script>
