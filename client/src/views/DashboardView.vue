<template>
  <div>
    <!-- Route to appropriate dashboard based on user role -->
    <BuyerDashboard v-if="userRole === 'buyer' && userOnboarded" />
    <SellerDashboard v-else-if="userRole === 'seller' && userOnboarded" />
    <CourierDashboard v-else-if="userRole === 'courier' && userOnboarded" />
    <AdminDashboard v-else-if="userRole === 'admin'" />
    
    <!-- Onboarding incomplete - redirect to appropriate onboarding flow -->
    <div v-else-if="userRole && !userOnboarded" class="container mx-auto px-4 py-8">
      <div class="card text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Complete Your Profile</h1>
        <p class="text-gray-600 mb-6">Please complete your onboarding to access the full dashboard features.</p>
        <div class="space-y-4">
          <button
            v-if="userRole === 'buyer'"
            @click="$router.push('/onboarding/buyer')"
            class="btn btn-primary"
          >
            Complete Buyer Onboarding
          </button>
          <button
            v-if="userRole === 'seller'"
            @click="$router.push('/onboarding/seller')"
            class="btn btn-primary"
          >
            Complete Seller Onboarding
          </button>
          <button
            v-if="userRole === 'courier'"
            @click="$router.push('/onboarding/courier')"
            class="btn btn-primary"
          >
            Complete Courier Onboarding
          </button>
        </div>
      </div>
    </div>
    
    <!-- Fallback for unknown role -->
    <div v-else class="container mx-auto px-4 py-8">
      <div class="card text-center">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Welcome to KODO</h1>
        <p class="text-gray-600">Your dashboard is loading...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import BuyerDashboard from './dashboard/BuyerDashboard.vue';
import SellerDashboard from './dashboard/SellerDashboard.vue';
import CourierDashboard from './dashboard/CourierDashboard.vue';
import AdminDashboard from './dashboard/AdminDashboard.vue';

const router = useRouter();
const authStore = useAuthStore();

const userRole = computed(() => authStore.user?.role);
const userOnboarded = ref(true); // Assume onboarded until we check

const checkOnboardingStatus = async () => {
  try {
    const response = await fetch('/api/onboarding/status', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      userOnboarded.value = data.onboarded;
    } else {
      // If API fails, assume onboarded to avoid blocking users
      userOnboarded.value = true;
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    userOnboarded.value = true;
  }
};

onMounted(() => {
  if (authStore.isAuthenticated && authStore.user?.role !== 'admin') {
    checkOnboardingStatus();
  }
});
</script>
