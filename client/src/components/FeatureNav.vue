<template>
  <nav class="feature-nav">
    <div class="nav-header">
      <h3>✨ Enhanced Features</h3>
      <button @click="isExpanded = !isExpanded" class="toggle-btn">
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>

    <div v-if="isExpanded" class="nav-content">
      <!-- Buyer Features -->
      <div v-if="userRole === 'buyer' || !userRole" class="nav-section">
        <h4>🛍️ Shopping</h4>
        <router-link to="/compare" class="nav-link">
          <span class="icon">🔍</span>
          <span>Compare Products</span>
        </router-link>
        <router-link to="/digital-library" class="nav-link" v-if="isAuthenticated">
          <span class="icon">📦</span>
          <span>Digital Products</span>
        </router-link>
        <router-link to="/subscriptions" class="nav-link" v-if="isAuthenticated">
          <span class="icon">🔄</span>
          <span>My Subscriptions</span>
        </router-link>
        <router-link to="/gift-cards" class="nav-link" v-if="isAuthenticated">
          <span class="icon">🎁</span>
          <span>Gift Cards</span>
        </router-link>
      </div>

      <!-- Account Features -->
      <div v-if="isAuthenticated" class="nav-section">
        <h4>👤 Account</h4>
        <router-link to="/settings/privacy" class="nav-link">
          <span class="icon">🔒</span>
          <span>Privacy Settings</span>
        </router-link>
      </div>

      <!-- Seller Features -->
      <div v-if="userRole === 'seller'" class="nav-section">
        <h4>💼 Seller Tools</h4>
        <router-link to="/seller/analytics" class="nav-link">
          <span class="icon">📊</span>
          <span>Analytics Dashboard</span>
        </router-link>
        <router-link to="/seller/bulk-upload" class="nav-link">
          <span class="icon">📦</span>
          <span>Bulk Upload</span>
        </router-link>
      </div>

      <!-- Admin Features -->
      <div v-if="userRole === 'admin'" class="nav-section">
        <h4>⚙️ Admin</h4>
        <router-link to="/admin/fraud-detection" class="nav-link">
          <span class="icon">🛡️</span>
          <span>Fraud Detection</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isExpanded = ref(true);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const userRole = computed(() => authStore.user?.role);
</script>

<style scoped>
.feature-nav {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.toggle-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: white;
  color: #667eea;
}

.nav-content {
  padding: 1rem;
}

.nav-section {
  margin-bottom: 1.5rem;
}

.nav-section:last-child {
  margin-bottom: 0;
}

.nav-section h4 {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.75rem;
  padding: 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #333;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  margin-bottom: 0.25rem;
}

.nav-link:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.nav-link.router-link-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-link .icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}

/* Compact mode for sidebar */
.feature-nav.compact {
  max-width: 280px;
}

.feature-nav.compact .nav-link {
  font-size: 0.875rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .feature-nav {
    margin: 1rem;
  }

  .nav-content {
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
