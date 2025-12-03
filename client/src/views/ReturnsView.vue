<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Returns & Exchanges</h1>
        <button @click="showCreateModal = true" class="btn btn-primary">
          + Request Return
        </button>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="returns.length === 0" class="card text-center py-12">
        <p class="text-gray-500 mb-4">No return requests yet</p>
        <button @click="showCreateModal = true" class="btn btn-primary">
          Request a Return
        </button>
      </div>

      <div v-else class="space-y-4">
        <div v-for="returnReq in returns" :key="returnReq.id" class="card">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="font-semibold text-gray-900 mb-1">Return Request #{{ returnReq.id.slice(0, 8) }}</h3>
              <p class="text-sm text-gray-600">Order #{{ returnReq.orderId }}</p>
            </div>
            <span
              :class="{
                'badge-warning': returnReq.status === 'pending',
                'badge-success': returnReq.status === 'approved' || returnReq.status === 'completed',
                'badge-danger': returnReq.status === 'rejected',
              }"
            >
              {{ returnReq.status }}
            </span>
          </div>

          <p class="text-sm text-gray-700 mb-2"><strong>Reason:</strong> {{ returnReq.reason }}</p>
          <p class="text-sm text-gray-600 mb-4">{{ returnReq.description }}</p>

          <div class="flex gap-2">
            <button v-if="returnReq.status === 'pending'" @click="cancelReturn(returnReq.id)" class="btn btn-secondary btn-sm">
              Cancel Request
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Return Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content max-w-2xl">
        <h3 class="text-xl font-semibold mb-6">Request Return</h3>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Order ID</label>
            <input v-model="form.orderId" type="text" required class="input" placeholder="Enter order ID" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <select v-model="form.reason" required class="input">
              <option value="">Select reason</option>
              <option value="defective">Defective/Damaged</option>
              <option value="wrong_item">Wrong Item</option>
              <option value="not_as_described">Not as Described</option>
              <option value="changed_mind">Changed Mind</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea v-model="form.description" rows="4" required class="input" placeholder="Explain your issue..."></textarea>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" :disabled="submitting" class="btn btn-primary flex-1">
              {{ submitting ? 'Submitting...' : 'Submit Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import returnService from '../services/returnService';

const returns = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const form = ref({ orderId: '', reason: '', description: '' });

onMounted(() => {
  loadReturns();
});

async function loadReturns() {
  loading.value = true;
  try {
    const data = await returnService.getReturns();
    returns.value = data.returns || [];
  } catch (error) {
    console.error('Failed to load returns:', error);
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  submitting.value = true;
  try {
    await returnService.createReturn(form.value);
    showCreateModal.value = false;
    form.value = { orderId: '', reason: '', description: '' };
    loadReturns();
  } catch (error) {
    console.error('Failed to create return:', error);
    alert('Failed to submit return request. Please try again.');
  } finally {
    submitting.value = false;
  }
}

async function cancelReturn(id) {
  if (!confirm('Are you sure you want to cancel this return request?')) return;

  try {
    await returnService.cancelReturn(id);
    loadReturns();
  } catch (error) {
    console.error('Failed to cancel return:', error);
    alert('Failed to cancel return. Please try again.');
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
