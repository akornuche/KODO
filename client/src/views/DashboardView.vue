<template>
  <div>
    <!-- Route to appropriate dashboard based on user role -->
    <BuyerDashboard v-if="userRole === 'buyer'" />
    <SellerDashboard v-else-if="userRole === 'seller'" />
    <CourierDashboard v-else-if="userRole === 'courier'" />
    <AdminDashboard v-else-if="userRole === 'admin'" />
    
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
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import BuyerDashboard from './dashboard/BuyerDashboard.vue';
import SellerDashboard from './dashboard/SellerDashboard.vue';
import CourierDashboard from './dashboard/CourierDashboard.vue';
import AdminDashboard from './dashboard/AdminDashboard.vue';

const authStore = useAuthStore();
const userRole = computed(() => authStore.user?.role);
</script>
