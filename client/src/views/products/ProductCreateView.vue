<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <button @click="$router.back()" class="mb-4 text-primary-600 hover:text-primary-700 flex items-center gap-2">
        ← Back to Dashboard
      </button>
      <h1 class="text-3xl font-bold text-gray-900">Add New Product</h1>
      <p class="text-gray-600 mt-2">Create a new product listing for buyers to bid on</p>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-8">
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
              <p class="text-gray-600 mb-1">Click to upload images</p>
              <p class="text-sm text-gray-500">or drag and drop</p>
            </div>
          </div>

          <!-- Image Preview -->
          <div v-if="form.images.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="(image, index) in form.images"
              :key="index"
              class="relative group"
            >
              <img
                :src="image.preview || image.url"
                :alt="`Product image ${index + 1}`"
                class="w-full h-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                @click="removeImage(index)"
                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <div v-if="index === 0" class="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                Main
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-500 mt-2">
            {{ form.images.length }}/10 images uploaded. First image will be the main product image.
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
            {{ submitting ? 'Creating Product...' : 'Create Product' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProductStore } from '@/stores/product';
import { formatCurrency } from '@/utils/helpers';

const router = useRouter();
const productStore = useProductStore();

const fileInput = ref(null);
const newTag = ref('');
const uploadingImages = ref(false);
const submitting = ref(false);

const form = reactive({
  title: '',
  description: '',
  price: null,
  category: '',
  condition: '',
  location: '',
  tags: [],
  images: [],
});

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
  if (files.length + form.images.length > 10) {
    alert('Maximum 10 images allowed');
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

      form.images.push({
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

const removeImage = (index) => {
  const image = form.images[index];
  if (image.preview) {
    URL.revokeObjectURL(image.preview);
  }
  form.images.splice(index, 1);
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

    // Create product
    const product = await productStore.createProduct(productData);

    // Upload images if any
    if (form.images.length > 0) {
      const imageFiles = form.images.map(img => img.file);
      await productStore.uploadProductImages(product.id, imageFiles);
    }

    alert('Product created successfully!');
    router.push(`/products/${product.id}`);
  } catch (error) {
    console.error('Error creating product:', error);
    alert(error.response?.data?.message || 'Failed to create product. Please try again.');
  } finally {
    submitting.value = false;
  }
};
</script>