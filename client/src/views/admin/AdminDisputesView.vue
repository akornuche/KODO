<template>
  <div>
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">View Disputes</h1>
    </div>

    <!-- Status Filter -->
    <div class="card mb-6">
      <div class="flex gap-4">
        <select v-model="filters.status" class="input flex-1" @change="fetchDisputes">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button @click="fetchDisputes" class="btn btn-primary">Refresh</button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="card text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="mt-4 text-gray-600">Loading disputes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-red-50 border border-red-200 text-red-700 py-4 px-6">
      {{ error }}
    </div>

    <!-- Disputes List -->
    <div v-else class="space-y-4">
      <div v-if="disputes.length === 0" class="card text-center py-12 text-gray-500">
        <p>No disputes found.</p>
      </div>

      <div v-for="dispute in disputes" :key="dispute.id" class="card">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Order #{{ dispute.orderId?.slice(0, 8) }}</h3>
            <p class="text-sm text-gray-600">Dispute ID: {{ dispute.id.slice(0, 12) }}</p>
          </div>
          <span :class="['badge', getStatusBadgeClass(dispute.status)]">
            {{ dispute.status }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 py-4 border-y">
          <div>
            <p class="text-xs text-gray-500 mb-1">Raised By</p>
            <p class="font-medium">{{ dispute.createdBy?.username }}</p>
            <p class="text-xs text-gray-600">({{ dispute.createdBy?.role }})</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Amount</p>
            <p class="font-medium text-lg">₦{{ formatCurrency(dispute.amount) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1">Created</p>
            <p class="text-sm">{{ formatDate(dispute.createdAt) }}</p>
          </div>
        </div>

        <div class="mb-4">
          <p class="text-sm font-semibold text-gray-700 mb-2">Reason</p>
          <p class="text-sm text-gray-600">{{ dispute.reason }}</p>
        </div>

        <div v-if="dispute.resolution" class="mb-4 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-semibold text-gray-700 mb-2">Resolution</p>
          <p class="text-sm text-gray-600">{{ dispute.resolution }}</p>
        </div>

        <div v-if="dispute.status === 'open'" class="flex gap-2">
          <button @click="openResolveModal(dispute)" class="btn btn-primary text-sm">
            Resolve Dispute
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="meta && meta.totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="btn btn-sm"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
      >
        Previous
      </button>
      <span class="text-sm text-gray-600">
        Page {{ currentPage }} of {{ meta.totalPages }}
      </span>
      <button
        @click="currentPage++"
        :disabled="currentPage === meta.totalPages"
        class="btn btn-sm"
        :class="{ 'opacity-50 cursor-not-allowed': currentPage === meta.totalPages }"
      >
        Next
      </button>
    </div>

    <!-- Resolve Modal -->
    <div v-if="showResolveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Resolve Dispute</h2>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
          <textarea
            v-model="resolveForm.resolution"
            class="input h-24"
            placeholder="Describe the resolution..."
          ></textarea>
        </div>

        <div class="mb-4">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="resolveForm.refundBuyer" class="rounded" />
            <span class="text-sm text-gray-700">Refund buyer</span>
          </label>
        </div>

        <div class="flex gap-2">
          <button @click="handleResolve" :disabled="submitting" class="flex-1 btn btn-primary">
            {{ submitting ? 'Resolving...' : 'Resolve' }}
          </button>
          <button @click="showResolveModal = false" class="flex-1 btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { formatCurrency, formatDate } from '@/utils/helpers';
import api from '@/services/api';

const disputes = ref([]);
const meta = ref(null);
const loading = ref(false);
const error = ref(null);
const currentPage = ref(1);
const submitting = ref(false);

const filters = ref({
  status: '',
});

const showResolveModal = ref(false);
const selectedDispute = ref(null);
const resolveForm = ref({
  resolution: '',
  refundBuyer: false,
});

const fetchDisputes = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 20,
      status: filters.value.status,
    });

    const response = await api.get(`/admin/disputes?${params}`);
    disputes.value = response.data.disputes;
    meta.value = response.data.meta;
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load disputes';
  } finally {
    loading.value = false;
  }
};

const openResolveModal = (dispute) => {
  selectedDispute.value = dispute;
  resolveForm.value = {
    resolution: '',
    refundBuyer: false,
  };
  showResolveModal.value = true;
};

const handleResolve = async () => {
  if (!resolveForm.value.resolution.trim()) {
    alert('Please enter a resolution');
    return;
  }

  submitting.value = true;

  try {
    await api.put(`/admin/disputes/${selectedDispute.value.id}/resolve`, {
      resolution: resolveForm.value.resolution,
      refundBuyer: resolveForm.value.refundBuyer,
    });

    showResolveModal.value = false;
    await fetchDisputes();
    alert('Dispute resolved successfully');
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to resolve dispute');
  } finally {
    submitting.value = false;
  }
};

const getStatusBadgeClass = (status) => {
  const map = {
    open: 'badge-yellow',
    in_progress: 'badge-blue',
    resolved: 'badge-green',
    closed: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};

watch(() => currentPage.value, fetchDisputes);

onMounted(fetchDisputes);
</script>
