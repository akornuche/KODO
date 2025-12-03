<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
        <p class="text-gray-600">{{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }} in your cart</p>
      </div>

      <!-- Empty Cart State -->
      <div v-if="isEmpty" class="text-center py-16">
        <div class="text-6xl mb-4">🛒</div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
        <p class="text-gray-600 mb-8">Add some products to get started!</p>
        <router-link to="/products" class="btn btn-primary">
          Browse Products
        </router-link>
      </div>

      <!-- Cart Items -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Cart Items List -->
        <div class="lg:col-span-2 space-y-4">
          <div
            v-for="item in items"
            :key="item.id"
            class="card flex gap-4"
          >
            <!-- Product Image -->
            <div class="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
              <img
                v-if="item.image"
                :src="getImageUrl(item.image)"
                :alt="item.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            </div>

            <!-- Product Details -->
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 mb-1">{{ item.title }}</h3>
              <p class="text-sm text-gray-600 mb-2">Seller: {{ item.seller?.username || 'Unknown' }}</p>
              <p class="text-lg font-bold text-primary-600">{{ formatCurrency(item.price) }}</p>
            </div>

            <!-- Quantity and Actions -->
            <div class="flex flex-col items-end gap-2">
              <!-- Quantity Controls -->
              <div class="flex items-center gap-2">
                <button
                  @click="updateQuantity(item.id, item.quantity - 1)"
                  class="btn btn-sm btn-secondary"
                  :disabled="item.quantity <= 1"
                >
                  -
                </button>
                <span class="w-8 text-center">{{ item.quantity }}</span>
                <button
                  @click="updateQuantity(item.id, item.quantity + 1)"
                  class="btn btn-sm btn-secondary"
                >
                  +
                </button>
              </div>

              <!-- Subtotal -->
              <p class="text-sm font-medium text-gray-900">
                Subtotal: {{ formatCurrency(item.price * item.quantity) }}
              </p>

              <!-- Remove Button -->
              <button
                @click="removeItem(item.id)"
                class="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Checkout Summary -->
        <div class="space-y-6">
          <!-- Order Summary -->
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Order Summary</h2>

            <div class="space-y-2 mb-4">
              <div class="flex justify-between text-gray-700">
                <span>Items ({{ itemCount }})</span>
                <span>{{ formatCurrency(totalAmount) }}</span>
              </div>
              <div class="flex justify-between text-gray-700">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span class="text-green-600">{{ formatCurrency(totalAmount) }}</span>
              </div>
            </div>

            <button
              @click="showCheckoutModal = true"
              class="btn btn-primary w-full"
            >
              Proceed to Checkout
            </button>
          </div>

          <!-- Continue Shopping -->
          <div class="text-center">
            <router-link to="/products" class="text-primary-600 hover:text-primary-700">
              ← Continue Shopping
            </router-link>
          </div>
        </div>
      </div>

      <!-- Checkout Modal -->
      <div
        v-if="showCheckoutModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-xl font-bold mb-4">Complete Your Order</h3>

          <form @submit.prevent="handleCheckout">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <textarea
                v-model="checkoutForm.deliveryAddress"
                required
                rows="3"
                class="input"
                placeholder="Enter your full delivery address..."
              ></textarea>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                v-model="checkoutForm.notes"
                rows="2"
                class="input"
                placeholder="Any special instructions..."
              ></textarea>
            </div>

            <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-700 mb-2">
                📍 <strong>Order Summary:</strong>
              </p>
              <p class="text-sm text-blue-700">
                {{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }} • {{ formatCurrency(totalAmount) }}
              </p>
            </div>

            <div class="flex gap-3">
              <button
                type="submit"
                class="btn btn-primary flex-1"
                :disabled="isLoading"
              >
                {{ isLoading ? 'Creating Orders...' : 'Place Order' }}
              </button>
              <button
                type="button"
                @click="showCheckoutModal = false"
                class="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { formatCurrency } from '../utils/helpers';

const router = useRouter();
const cartStore = useCartStore();

const showCheckoutModal = ref(false);

const checkoutForm = reactive({
  deliveryAddress: '',
  notes: '',
});

// Computed properties from cart store
const items = computed(() => cartStore.items);
const itemCount = computed(() => cartStore.itemCount);
const totalAmount = computed(() => cartStore.totalAmount);
const isEmpty = computed(() => cartStore.isEmpty);
const isLoading = computed(() => cartStore.isLoading);

const getImageUrl = (imagePath) => {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${imagePath}`;
};

const updateQuantity = (productId, quantity) => {
  cartStore.updateQuantity(productId, quantity);
};

const removeItem = (productId) => {
  cartStore.removeItem(productId);
};

const handleCheckout = async () => {
  if (!checkoutForm.deliveryAddress.trim()) {
    alert('Please enter a delivery address');
    return;
  }

  try {
    const orders = await cartStore.checkout(
      checkoutForm.deliveryAddress.trim(),
      checkoutForm.notes.trim()
    );

    showCheckoutModal.value = false;

    // Redirect to the first order's detail page
    if (orders.length > 0) {
      router.push(`/orders/${orders[0].id}`);
    }
  } catch (err) {
    alert(err.message || 'Failed to create orders');
  }
};

onMounted(() => {
  // Pre-fill delivery address if user has one
  // This could be enhanced to get from user profile
});
</script>