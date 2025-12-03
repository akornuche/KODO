<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Create Bid Request</h1>
          <router-link to="/requests" class="btn btn-secondary">
            ← Back to Requests
          </router-link>
        </div>

        <form @submit.prevent="submitRequest" class="space-y-6">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              What are you looking for?
            </label>
            <input
              v-model="form.title"
              type="text"
              maxlength="100"
              class="input"
              placeholder="e.g., iPhone 12 Pro, Gaming Laptop, Mountain Bike"
              required
            />
            <p class="text-xs text-gray-500 mt-1">
              {{ form.title.length }}/100 characters
            </p>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select v-model="form.category" class="input" required>
              <option value="">Select a category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing & Fashion</option>
              <option value="home">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="books">Books & Media</option>
              <option value="automotive">Automotive</option>
              <option value="collectibles">Collectibles</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Budget -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Your Budget (NGN)
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                v-model.number="form.budget"
                type="number"
                min="1"
                max="100000"
                step="0.01"
                class="input pl-8"
                placeholder="0.00"
                required
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Maximum amount you're willing to pay
            </p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="6"
              maxlength="1000"
              class="input"
              placeholder="Describe what you're looking for in detail. Include specifications, condition preferences, location, etc."
              required
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              {{ form.description.length }}/1000 characters
            </p>
          </div>

          <!-- Location -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Preferred Location
            </label>
            <input
              v-model="form.location"
              type="text"
              maxlength="100"
              class="input"
              placeholder="City, State or 'Remote/Anywhere'"
            />
            <p class="text-xs text-gray-500 mt-1">
              Where you'd like to pick up or have it delivered
            </p>
          </div>

          <!-- Condition -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Preferred Condition
            </label>
            <select v-model="form.condition" class="input">
              <option value="">Any condition</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-4 pt-4">
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="btn btn-primary flex-1"
            >
              <span v-if="loading">Creating Request...</span>
              <span v-else>Post Request</span>
            </button>
            <router-link to="/requests" class="btn btn-secondary">
              Cancel
            </router-link>
          </div>
        </form>

        <!-- Help Text -->
        <div class="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 class="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Post your request and sellers will submit offers</li>
            <li>• Review offers and accept the best one</li>
            <li>• Complete payment and arrange pickup/delivery</li>
            <li>• Your request expires after 30 days if no offers are accepted</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '../../stores/dashboard';

const router = useRouter();
const dashboardStore = useDashboardStore();

const loading = ref(false);

const form = ref({
  title: '',
  category: '',
  budget: null,
  description: '',
  location: '',
  condition: '',
});

const isFormValid = computed(() => {
  return (
    form.value.title.trim().length >= 5 &&
    form.value.category &&
    form.value.budget > 0 &&
    form.value.description.trim().length >= 20
  );
});

const submitRequest = async () => {
  if (!isFormValid.value) {
    alert('Please fill in all required fields correctly.');
    return;
  }

  loading.value = true;

  try {
    const requestData = {
      title: form.value.title.trim(),
      category: form.value.category,
      budget: form.value.budget,
      description: form.value.description.trim(),
      location: form.value.location.trim() || null,
      condition: form.value.condition || null,
    };

    await dashboardStore.createBid(requestData);

    // Redirect to requests page
    router.push('/requests');
  } catch (error) {
    console.error('Failed to create request:', error);
    alert(error.response?.data?.message || 'Failed to create request. Please try again.');
  } finally {
    loading.value = false;
  }
};
</script>