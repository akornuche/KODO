<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>

    <!-- Tabs -->
    <div class="mb-6 border-b">
      <nav class="flex gap-6 overflow-x-auto">
        <button
          @click="activeTab = 'dashboard'"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors whitespace-nowrap',
            activeTab === 'dashboard'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Dashboard
        </button>
        <button
          @click="activeTab = 'users'; fetchUsers()"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors whitespace-nowrap',
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Users
        </button>
        <button
          @click="activeTab = 'products'; fetchProducts()"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors whitespace-nowrap',
            activeTab === 'products'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Products
        </button>
        <button
          @click="activeTab = 'disputes'; fetchDisputes()"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors whitespace-nowrap',
            activeTab === 'disputes'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Disputes
          <span v-if="pendingDisputesCount > 0" class="ml-2 badge-danger">
            {{ pendingDisputesCount }}
          </span>
        </button>
        <button
          @click="activeTab = 'analytics'"
          :class="[
            'pb-3 border-b-2 font-medium transition-colors whitespace-nowrap',
            activeTab === 'analytics'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          Analytics
        </button>
      </nav>
    </div>

    <!-- Dashboard Tab -->
    <div v-if="activeTab === 'dashboard'">
      <div v-if="loading.stats" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div v-for="i in 4" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div class="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>

      <div v-else-if="stats">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <p class="text-sm opacity-90 mb-1">Total Users</p>
            <p class="text-3xl font-bold">{{ stats.totalUsers || 0 }}</p>
            <p class="text-xs opacity-75 mt-2">
              Active: {{ stats.activeUsers || 0 }}
            </p>
          </div>
          <div class="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <p class="text-sm opacity-90 mb-1">Active Products</p>
            <p class="text-3xl font-bold">{{ stats.activeProducts || 0 }}</p>
            <p class="text-xs opacity-75 mt-2">
              Total: {{ stats.totalProducts || 0 }}
            </p>
          </div>
          <div class="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <p class="text-sm opacity-90 mb-1">Total Orders</p>
            <p class="text-3xl font-bold">{{ stats.totalOrders || 0 }}</p>
            <p class="text-xs opacity-75 mt-2">
              Completed: {{ stats.completedOrders || 0 }}
            </p>
          </div>
          <div class="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <p class="text-sm opacity-90 mb-1">Platform Revenue</p>
            <p class="text-3xl font-bold">{{ formatCurrency(stats.totalRevenue || 0) }}</p>
            <p class="text-xs opacity-75 mt-2">
              This month: {{ formatCurrency(stats.revenueThisMonth || 0) }}
            </p>
          </div>
        </div>

        <!-- Overview Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Platform Overview</h2>
            <div class="space-y-3">
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Buyers</span>
                <span class="font-semibold">{{ stats.buyerCount || 0 }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Sellers</span>
                <span class="font-semibold">{{ stats.sellerCount || 0 }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-gray-600">Couriers</span>
                <span class="font-semibold">{{ stats.courierCount || 0 }}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-gray-600">Pending Disputes</span>
                <span class="font-semibold text-red-600">{{ stats.pendingDisputes || 0 }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
            <div class="space-y-2">
              <button @click="activeTab = 'users'; fetchUsers()" class="btn btn-primary w-full">
                Manage Users
              </button>
              <button @click="activeTab = 'products'; fetchProducts()" class="btn btn-secondary w-full">
                Manage Products
              </button>
              <button @click="activeTab = 'disputes'; fetchDisputes()" class="btn btn-secondary w-full">
                View Disputes
              </button>
              <button @click="activeTab = 'analytics'" class="btn btn-secondary w-full">
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'">
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="userSearchQuery"
              @input="searchUsers"
              type="text"
              class="input"
              placeholder="Search users..."
            />
          </div>
          <select v-model="userRoleFilter" @change="filterUsers" class="input w-48">
            <option value="">All Roles</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="courier">Courier</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div v-if="loading.users" class="card animate-pulse">
        <div class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="users.length === 0" class="card text-center py-8">
        <p class="text-gray-600">No users found.</p>
      </div>

      <div v-else class="card overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left py-3 px-4 font-semibold text-gray-700">User</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
              <th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-b hover:bg-gray-50">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
                    {{ user.username?.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium">{{ user.username }}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">{{ user.email }}</td>
              <td class="py-3 px-4">
                <span :class="getRoleBadgeClass(user.role)">{{ user.role }}</span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="py-3 px-4">
                <div class="flex gap-2">
                  <button
                    @click="openRoleModal(user)"
                    class="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    @click="handleDeleteUser(user.id, user.username)"
                    class="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Products Tab -->
    <div v-if="activeTab === 'products'">
      <div class="card mb-6">
        <input
          v-model="productSearchQuery"
          @input="searchProducts"
          type="text"
          class="input"
          placeholder="Search products..."
        />
      </div>

      <div v-if="loading.products" class="space-y-4">
        <div v-for="i in 3" :key="i" class="card animate-pulse">
          <div class="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="products.length === 0" class="card text-center py-8">
        <p class="text-gray-600">No products found.</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="product in products" :key="product.id" class="card">
          <div class="flex gap-4">
            <div class="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
              <img
                v-if="product.images?.[0]"
                :src="getImageUrl(product.images[0])"
                :alt="product.title"
                class="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div class="flex-1">
              <div class="flex justify-between">
                <div>
                  <h3 class="font-semibold">{{ product.title }}</h3>
                  <p class="text-sm text-gray-600">by {{ product.seller?.username }}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-green-600">{{ formatCurrency(product.price) }}</p>
                  <span :class="`badge-${product.status === 'active' ? 'success' : 'secondary'}`">
                    {{ product.status }}
                  </span>
                </div>
              </div>
              <div class="flex gap-3 mt-2">
                <router-link :to="`/products/${product.id}`" class="text-primary-600 text-sm">
                  View
                </router-link>
                <button
                  @click="handleDeleteProduct(product.id, product.title)"
                  class="text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Disputes Tab -->
    <div v-if="activeTab === 'disputes'">
      <div v-if="loading.disputes" class="space-y-4">
        <div v-for="i in 2" :key="i" class="card animate-pulse">
          <div class="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="disputes.length === 0" class="card text-center py-8">
        <p class="text-gray-600">No disputes found.</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="dispute in disputes" :key="dispute.id" class="card">
          <div class="flex justify-between mb-3">
            <div>
              <h3 class="font-semibold">Dispute #{{ dispute.id.slice(0, 8) }}</h3>
              <p class="text-sm text-gray-600">Order #{{ dispute.orderId?.slice(0, 8) }}</p>
            </div>
            <span :class="`badge-${dispute.status === 'pending' ? 'warning' : 'success'}`">
              {{ dispute.status }}
            </span>
          </div>
          <p class="text-sm mb-2"><strong>Reason:</strong> {{ dispute.reason }}</p>
          <p class="text-sm text-gray-600 mb-3">{{ dispute.description }}</p>
          <button
            v-if="dispute.status === 'pending'"
            @click="openResolveModal(dispute)"
            class="btn btn-sm btn-primary"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-if="activeTab === 'analytics'">
      <div class="card text-center py-12">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-xl font-semibold mb-2">Analytics Dashboard</h3>
        <p class="text-gray-600">
          Advanced analytics with charts would appear here<br/>
          (Revenue trends, User growth, Order statistics)
        </p>
      </div>
    </div>

    <!-- Role Modal -->
    <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Change User Role</h3>
        <p class="mb-4">User: <strong>{{ selectedUser?.username }}</strong></p>
        <form @submit.prevent="handleRoleChange">
          <select v-model="newRole" required class="input mb-4">
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="courier">Courier</option>
            <option value="admin">Admin</option>
          </select>
          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" :disabled="updatingRole">
              {{ updatingRole ? 'Updating...' : 'Update' }}
            </button>
            <button type="button" @click="closeRoleModal" class="btn btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Resolve Modal -->
    <div v-if="showResolveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Resolve Dispute</h3>
        <form @submit.prevent="handleResolveDispute">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Resolution</label>
            <select v-model="resolveForm.resolution" required class="input">
              <option value="">Select...</option>
              <option value="refund_buyer">Refund Buyer</option>
              <option value="favor_seller">Favor Seller</option>
              <option value="partial_refund">Partial Refund</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Notes</label>
            <textarea v-model="resolveForm.notes" required class="input" rows="3"></textarea>
          </div>
          <div class="flex gap-3">
            <button type="submit" class="btn btn-primary flex-1" :disabled="resolvingDispute">
              {{ resolvingDispute ? 'Resolving...' : 'Resolve' }}
            </button>
            <button type="button" @click="closeResolveModal" class="btn btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin';
import { formatCurrency, formatDate, getImageUrl, getRoleBadgeClass } from '@/utils/helpers';

const adminStore = useAdminStore();

const activeTab = ref('dashboard');
const userSearchQuery = ref('');
const userRoleFilter = ref('');
const productSearchQuery = ref('');
const showRoleModal = ref(false);
const showResolveModal = ref(false);
const selectedUser = ref(null);
const selectedDispute = ref(null);
const newRole = ref('');
const updatingRole = ref(false);
const resolvingDispute = ref(false);

const resolveForm = reactive({ resolution: '', notes: '' });

const stats = computed(() => adminStore.stats);
const users = computed(() => adminStore.users);
const products = computed(() => adminStore.products);
const disputes = computed(() => adminStore.disputes);
const loading = computed(() => adminStore.loading);
const pendingDisputesCount = computed(() => adminStore.pendingDisputesCount);

const fetchUsers = () => adminStore.fetchUsers({ role: userRoleFilter.value });
const searchUsers = () => adminStore.fetchUsers({ search: userSearchQuery.value });
const filterUsers = () => fetchUsers();
const fetchProducts = () => adminStore.fetchProducts({ search: productSearchQuery.value });
const searchProducts = () => fetchProducts();
const fetchDisputes = () => adminStore.fetchDisputes();

const openRoleModal = (user) => {
  selectedUser.value = user;
  newRole.value = user.role;
  showRoleModal.value = true;
};

const closeRoleModal = () => {
  showRoleModal.value = false;
  selectedUser.value = null;
};

const handleRoleChange = async () => {
  updatingRole.value = true;
  try {
    await adminStore.updateUserRole(selectedUser.value.id, newRole.value);
    closeRoleModal();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update role');
  } finally {
    updatingRole.value = false;
  }
};

const handleDeleteUser = async (userId, username) => {
  if (!confirm(`Delete user "${username}"?`)) return;
  try {
    await adminStore.deleteUser(userId);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete user');
  }
};

const handleDeleteProduct = async (productId, title) => {
  if (!confirm(`Delete product "${title}"?`)) return;
  try {
    await adminStore.deleteProduct(productId);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete product');
  }
};

const openResolveModal = (dispute) => {
  selectedDispute.value = dispute;
  resolveForm.resolution = '';
  resolveForm.notes = '';
  showResolveModal.value = true;
};

const closeResolveModal = () => {
  showResolveModal.value = false;
  selectedDispute.value = null;
};

const handleResolveDispute = async () => {
  resolvingDispute.value = true;
  try {
    await adminStore.resolveDispute(selectedDispute.value.id, resolveForm);
    closeResolveModal();
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to resolve dispute');
  } finally {
    resolvingDispute.value = false;
  }
};

onMounted(() => adminStore.fetchStats());
</script>
