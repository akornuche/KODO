<template>
  <div class="min-h-screen bg-gray-50">
    <!-- PWA Install Prompt -->
    <PWAInstallPrompt />
    
    <!-- Navigation Bar -->
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <router-link to="/" class="flex items-center">
              <span class="text-2xl font-bold text-primary-600">KODO</span>
            </router-link>
            <div class="ml-4 flex items-center gap-4 overflow-x-auto">
              <router-link
                to="/products"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                Products
              </router-link>
              <router-link
                v-if="authStore.isBuyer"
                to="/requests"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                Requests
              </router-link>
              <router-link
                to="/faq"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                FAQ
              </router-link>
              <router-link
                v-if="authStore.isAuthenticated"
                to="/orders"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                Orders
              </router-link>
              <router-link
                v-if="authStore.isBuyer"
                to="/cart"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600 relative"
              >
                Cart
                <span
                  v-if="cartStore.itemCount > 0"
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {{ cartStore.itemCount }}
                </span>
              </router-link>
              <router-link
                v-if="authStore.isAuthenticated"
                to="/chat"
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
              >
                Chat
              </router-link>
            </div>
          </div>

          <div class="flex items-center space-x-4">
            <!-- Wallet Icon -->
            <router-link
              v-if="authStore.isAuthenticated"
              to="/wallet"
              class="text-gray-700 hover:text-gray-900 relative"
              title="Wallet"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </router-link>

            <!-- Wishlist Icon -->
            <router-link
              v-if="authStore.isBuyer"
              to="/wishlist"
              class="text-gray-700 hover:text-gray-900"
              title="Wishlist"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </router-link>

            <!-- User Menu Dropdown -->
            <div v-if="authStore.isAuthenticated" class="relative dropdown">
              <button
                type="button"
                class="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                @click.stop="isDropdownOpen = !isDropdownOpen"
              >
                <span class="badge" :class="`badge-${getRoleColor(authStore.user?.role)}`">
                  {{ authStore.user?.role }}
                </span>
                <span class="font-medium">{{ authStore.user?.username }}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                class="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                :class="{ hidden: !isDropdownOpen }"
                @click.stop
              >
                <router-link to="/profile" class="dropdown-item">Profile</router-link>
                <router-link to="/wallet" class="dropdown-item">Wallet</router-link>
                <router-link v-if="authStore.isBuyer" to="/wishlist" class="dropdown-item">Wishlist</router-link>
                <router-link v-if="authStore.isBuyer" to="/addresses" class="dropdown-item">Addresses</router-link>
                <router-link to="/followed-sellers" class="dropdown-item">Followed Sellers</router-link>
                <router-link to="/invoices" class="dropdown-item">Invoices</router-link>
                <router-link to="/returns" class="dropdown-item">Returns</router-link>
                <router-link to="/support" class="dropdown-item">Support</router-link>
                <router-link to="/settings" class="dropdown-item">Settings</router-link>
                <div class="border-t border-gray-100 my-1"></div>
                <button @click="handleLogout" class="dropdown-item text-red-600 w-full text-left">
                  Logout
                </button>
              </div>
            </div>

            <!-- Guest actions -->
            <div v-else class="flex items-center gap-3">
              <router-link to="/login" class="text-sm font-medium text-gray-700 hover:text-primary-600">
                Sign in
              </router-link>
              <router-link to="/register" class="btn btn-primary text-sm">
                Create account
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import { connectSocket } from './services/socket';
import { getRoleColor } from './utils/helpers';
import PWAInstallPrompt from './components/PWAInstallPrompt.vue';

const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();
const isDropdownOpen = ref(false);

const handleInvalidSocketToken = () => {
  authStore.logout();
  router.push('/login');
};

const handleDocumentClick = (event) => {
  const dropdown = document.querySelector('.dropdown');
  if (dropdown && !dropdown.contains(event.target)) {
    isDropdownOpen.value = false;
  }
};

onMounted(async () => {
  if (authStore.isAuthenticated) {
    const profileResult = await authStore.fetchProfile();
    if (profileResult.success && authStore.token) {
      connectSocket(authStore.token);
    } else {
      authStore.logout();
    }
  }

  window.addEventListener('kodo:auth-invalid', handleInvalidSocketToken);
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  window.removeEventListener('kodo:auth-invalid', handleInvalidSocketToken);
  document.removeEventListener('click', handleDocumentClick);
});

const handleLogout = () => {
  isDropdownOpen.value = false;
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.dropdown-item {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}
</style>
