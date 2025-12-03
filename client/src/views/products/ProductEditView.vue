<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <button @click="$router.back()" class="mb-4 text-primary-600 hover:text-primary-700 flex items-center gap-2">
        ← Back to Product
      </button>
      <h1 class="text-3xl font-bold text-gray-900">Edit Product</h1>
      <p class="text-gray-600 mt-2">Update your product information</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card animate-pulse">
      <div class="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div class="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card text-center text-red-600">
      {{ error }}
    </div>

    <!-- Form -->
    <form v-else-if="product" @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Basic Information -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-6">Basic Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Product Title *
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              maxlength="100"
              class="input"
              placeholder="e.g., Wireless Bluetooth Headphones"
            />
            <p class="text-xs text-gray-500 mt-1">{{ form.title.length }}/100 characters</p>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              v-model="form.description"
              required
              maxlength="1000"
              rows="4"
              class="input"
              placeholder="Describe your product in detail..."
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">{{ form.description.length }}/1000 characters</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Price *
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                v-model.number="form.price"
                type="number"
                required
                min="0.01"
                step="0.01"
                class="input pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select v-model="form.category" class="input">
              <option value="">Select a category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="home">Home & Garden</option>
              <option value="sports">Sports & Outdoors</option>
              <option value="books">Books & Media</option>
              <option value="automotive">Automotive</option>
              <option value="health">Health & Beauty</option>
              <option value="toys">Toys & Games</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Condition *
            </label>
            <select v-model="form.condition" required class="input">
              <option value="">Select condition</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              v-model="form.location"
              type="text"
              class="input"
              placeholder="City, State or Region"
            />
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-6">Tags</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Add tags to help buyers find your product
          </label>
          <div class="flex gap-2 mb-3">
            <input
              v-model="newTag"
              @keydown.enter.prevent="addTag"
              type="text"
              class="input flex-1"
              placeholder="Enter a tag and press Enter"
              maxlength="20"
            />
            <button
              type="button"
              @click="addTag"
              class="btn btn-secondary"
              :disabled="!newTag.trim()"
            >
              Add Tag
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="text-primary-600 hover:text-primary-800"
              >
                ×
              </button>
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-2">Maximum 10 tags allowed</p>
        </div>
      </div>

      <!-- Images -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-6">Product Images</h2>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload up to 10 images (Max 5MB each)
          </label>

          <!-- Image Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
            <input
              ref="fileInput"
              type="file"
              multiple
              accept="image/*"
              @change="handleFileSelect"
              class="hidden"
            />
            <div v-if="uploadingImages" class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p class="text-sm text-gray-600">Uploading images...</p>
            </div>
            <div v-else @click="$refs.fileInput.click()" class="cursor-pointer">
              <div class="text-4xl text-gray-400 mb-2">📷</div>
              <p class="text-gray-600 mb-1">Click to upload additional images</p>
              <p class="text-sm text-gray-500">or drag and drop</p>
            </div>
          </div>

          <!-- Existing Images -->
          <div v-if="existingImages.length > 0" class="mb-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Current Images</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                v-for="(image, index) in existingImages"
                :key="`existing-${index}`"
                class="relative group"
              >
                <img
                  :src="getImageUrl(image)"
                  :alt="`Product image ${index + 1}`"
                  class="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  @click="removeExistingImage(index)"
                  class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div v-if="index === 0" class="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  Main
                </div>
              </div>
            </div>
          </div>

          <!-- New Images Preview -->
          <div v-if="form.newImages.length > 0" class="mb-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">New Images to Upload</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                v-for="(image, index) in form.newImages"
                :key="`new-${index}`"
                class="relative group"
              >
                <img
                  :src="image.preview"
                  :alt="`New image ${index + 1}`"
                  class="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  @click="removeNewImage(index)"
                  class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            {{ totalImages }}/10 images total. First image will be the main product image.
          </p>
        </div>
      </div>

      <!-- Submit -->
      <div class="card">
        <div class="flex justify-end gap-4">
          <button
            type="button"
            @click="$router.back()"
            class="btn btn-secondary"
            :disabled="submitting"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="submitting || !isFormValid"
          >
            {{ submitting ? 'Updating Product...' : 'Update Product' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductStore } from '@/stores/product';
import { getImageUrl } from '@/utils/helpers';

const route = useRoute();
const router = useRouter();
const productStore = useProductStore();

const fileInput = ref(null);
const newTag = ref('');
const uploadingImages = ref(false);
const submitting = ref(false);
const loading = ref(false);
const error = ref(null);
const product = ref(null);

const form = reactive({
  title: '',
  description: '',
  price: null,
  category: '',
  condition: '',
  location: '',
  tags: [],
  newImages: [],
});

const existingImages = ref([]);

const totalImages = computed(() => existingImages.value.length + form.newImages.length);

const isFormValid = computed(() => {
  return form.title.trim() &&
         form.description.trim() &&
         form.price > 0 &&
         form.condition;
});

const addTag = () => {
  const tag = newTag.value.trim().toLowerCase();
  if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
    form.tags.push(tag);
    newTag.value = '';
  }
};

const removeTag = (tag) => {
  form.tags = form.tags.filter(t => t !== tag);
};

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);
  const totalAfterAdd = existingImages.value.length + form.newImages.length + files.length;

  if (totalAfterAdd > 10) {
    alert('Maximum 10 images allowed total');
    return;
  }

  uploadingImages.value = true;

  try {
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      // Create preview
      const preview = URL.createObjectURL(file);

      form.newImages.push({
        file,
        preview,
        name: file.name,
      });
    }
  } catch (error) {
    console.error('Error handling file selection:', error);
    alert('Error uploading images. Please try again.');
  } finally {
    uploadingImages.value = false;
  }
};

const removeExistingImage = (index) => {
  existingImages.value.splice(index, 1);
};

const removeNewImage = (index) => {
  const image = form.newImages[index];
  if (image.preview) {
    URL.revokeObjectURL(image.preview);
  }
  form.newImages.splice(index, 1);
};

const handleSubmit = async () => {
  if (!isFormValid.value) {
    alert('Please fill in all required fields');
    return;
  }

  submitting.value = true;

  try {
    // Prepare product data
    const productData = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: form.price,
      category: form.category || null,
      condition: form.condition,
      location: form.location.trim() || null,
      tags: form.tags,
    };

    // Update product
    const updatedProduct = await productStore.updateProduct(route.params.id, productData);

    // Handle image changes
    if (form.newImages.length > 0) {
      const imageFiles = form.newImages.map(img => img.file);
      await productStore.uploadProductImages(route.params.id, imageFiles);
    }

    // Handle image deletions (if we had a way to track which existing images to delete)
    // This would require additional API endpoints

    alert('Product updated successfully!');
    router.push(`/products/${route.params.id}`);
  } catch (error) {
    console.error('Error updating product:', error);
    alert(error.response?.data?.message || 'Failed to update product. Please try again.');
  } finally {
    submitting.value = false;
  }
};

const loadProduct = async () => {
  loading.value = true;
  error.value = null;

  try {
    product.value = await productStore.getProduct(route.params.id);

    // Populate form
    form.title = product.value.title;
    form.description = product.value.description;
    form.price = product.value.price;
    form.category = product.value.category || '';
    form.condition = product.value.condition;
    form.location = product.value.location || '';
    form.tags = [...(product.value.tags || [])];

    // Set existing images
    existingImages.value = product.value.images || [];
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load product';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadProduct();
});
</script>