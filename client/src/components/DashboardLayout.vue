<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-md hidden md:flex flex-col" role="navigation" aria-label="Main navigation">
      <!-- Sidebar Header -->
      <div class="px-6 py-4 border-b">
        <h2 class="text-xl font-bold text-gray-900">{{ dashboardTitle }}</h2>
      </div>

      <!-- Sidebar Menu -->
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Dashboard menu">
        <!-- Dashboard Section -->
        <div>
          <h3 class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</h3>
          <div class="space-y-1">
            <router-link
              v-for="item in sidebarMenu"
              :key="item.path"
              :to="item.path"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              :class="[
                'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive(item.path)
                  ? 'bg-primary-100 text-primary-700 shadow-sm border-l-4 border-primary-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="px-4 py-4 border-t space-y-1">
        <h3 class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</h3>
        <router-link to="/profile" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200" aria-label="Go to user profile">
          <UserCircleIcon class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Profile</span>
        </router-link>
        <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200" aria-label="Sign out of your account">
          <ArrowRightOnRectangleIcon class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Top Navigation Bar -->
      <header class="bg-white shadow-sm" role="banner">
        <div class="px-6 py-4 flex items-center justify-between">
          <!-- Mobile Menu Button -->
          <button
            @click="mobileSidebarOpen = !mobileSidebarOpen"
            class="md:hidden text-gray-700 hover:text-gray-900"
            aria-label="Toggle mobile navigation"
            :aria-expanded="mobileSidebarOpen"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Top Nav Items -->
          <div class="flex items-center gap-6 flex-1 ml-4 md:ml-0" role="navigation" aria-label="Top navigation">
            <router-link to="/products" class="text-sm font-medium text-gray-700 hover:text-primary-600">
              Browse Products
            </router-link>
            <router-link v-if="isBuyer" to="/requests" class="text-sm font-medium text-gray-700 hover:text-primary-600">
              View Requests
            </router-link>
            <router-link to="/orders" class="text-sm font-medium text-gray-700 hover:text-primary-600">
              View Orders
            </router-link>
            <router-link to="/chat" class="text-sm font-medium text-gray-700 hover:text-primary-600">
              Messages
            </router-link>
          </div>

          <!-- User Menu (Desktop Only) -->
          <div class="hidden md:flex items-center gap-4">
            <div class="relative dropdown">
              <button
                type="button"
                class="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                @click.stop="isDropdownOpen = !isDropdownOpen"
                :aria-expanded="isDropdownOpen"
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <span class="badge" :class="`badge-${getRoleColor(authStore.user?.role)}`">
                  {{ authStore.user?.role }}
                </span>
                <span class="font-medium text-sm">{{ authStore.user?.username }}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                class="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                :class="{ hidden: !isDropdownOpen }"
                @click.stop
                role="menu"
              >
                <router-link to="/profile" class="dropdown-item" role="menuitem">Profile</router-link>
                <router-link to="/settings" class="dropdown-item" role="menuitem">Settings</router-link>
                <div class="border-t border-gray-100 my-1"></div>
                <button @click="handleLogout" class="dropdown-item text-red-600 w-full text-left" role="menuitem">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto p-6" role="main">
        <slot />
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <transition name="fade">
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        @click="mobileSidebarOpen = false"
        role="presentation"
      ></div>
    </transition>

    <!-- Mobile Sidebar (only on mobile) -->
    <transition name="slideIn">
      <aside
        v-if="mobileSidebarOpen"
        class="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 md:hidden flex flex-col"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <!-- Sidebar Header -->
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">{{ dashboardTitle }}</h2>
          <button
            @click="mobileSidebarOpen = false"
            class="text-gray-500 hover:text-gray-700"
            aria-label="Close mobile menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Sidebar Menu -->
        <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Dashboard menu">
          <!-- Dashboard Section -->
          <div>
            <h3 class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</h3>
            <div class="space-y-1">
              <router-link
                v-for="item in sidebarMenu"
                :key="item.path"
                :to="item.path"
                @click="mobileSidebarOpen = false"
                :aria-current="isActive(item.path) ? 'page' : undefined"
                :class="[
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary-100 text-primary-700 shadow-sm border-l-4 border-primary-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                ]"
              >
                <component :is="item.icon" class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </router-link>
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="px-4 py-4 border-t space-y-1">
          <h3 class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</h3>
          <router-link to="/profile" @click="mobileSidebarOpen = false" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200" aria-label="Go to user profile">
            <UserCircleIcon class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>Profile</span>
          </router-link>
          <button @click="handleLogout" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200" aria-label="Sign out of your account">
            <ArrowRightOnRectangleIcon class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getRoleColor } from '@/utils/helpers';
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isDropdownOpen = ref(false);
const mobileSidebarOpen = ref(false);

const props = defineProps({
  title: {
    type: String,
    default: 'Dashboard'
  },
  sidebarMenu: {
    type: Array,
    default: () => []
  }
});

const dashboardTitle = computed(() => props.title);
const isBuyer = computed(() => authStore.user?.role === 'buyer');

const isActive = (path) => {
  return route.path.startsWith(path);
};

const handleLogout = () => {
  isDropdownOpen.value = false;
  mobileSidebarOpen.value = false;
  authStore.logout();
  router.push('/login');
};

// Handle clicking outside to close dropdowns
const handleDocumentClick = (e) => {
  // Close dropdown if clicking outside
  if (isDropdownOpen.value) {
    const dropdown = document.querySelector('.dropdown-menu');
    const button = document.querySelector('[aria-haspopup="menu"]');
    if (dropdown && !dropdown.contains(e.target) && button && !button.contains(e.target)) {
      isDropdownOpen.value = false;
    }
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.dropdown-item {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  transition: background-color 0.15s, color 0.15s;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.badge-blue {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-green {
  background-color: #dcfce7;
  color: #15803d;
}

.badge-purple {
  background-color: #e9d5ff;
  color: #6b21a8;
}

.badge-orange {
  background-color: #fed7aa;
  color: #92400e;
}

/* Smooth transitions for sidebar items */
a[aria-current="page"],
button[aria-current="page"] {
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0.8;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Focus visible for keyboard navigation */
:deep(a:focus-visible),
:deep(button:focus-visible) {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Mobile sidebar animations */
.slideIn-enter-active,
.slideIn-leave-active {
  transition: transform 0.3s ease-in-out;
}

.slideIn-enter-from {
  transform: translateX(-100%);
}

.slideIn-leave-to {
  transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
