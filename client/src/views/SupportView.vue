<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Support Center</h1>
        <button @click="showCreateModal = true" class="btn btn-primary">
          + New Ticket
        </button>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="tickets.length === 0" class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p class="text-gray-500 mb-4">No support tickets yet</p>
        <button @click="showCreateModal = true" class="btn btn-primary">
          Create a Ticket
        </button>
      </div>

      <div v-else class="space-y-4">
        <div v-for="ticket in tickets" :key="ticket.id" class="card hover:shadow-lg transition-shadow cursor-pointer" @click="viewTicket(ticket)">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-semibold text-gray-900">{{ ticket.subject }}</h3>
            <span :class="{
              'badge-success': ticket.status === 'closed',
              'badge-warning': ticket.status === 'open',
              'badge-primary': ticket.status === 'in_progress',
            }">
              {{ ticket.status }}
            </span>
          </div>
          <p class="text-sm text-gray-600 mb-2">{{ ticket.category }}</p>
          <p class="text-sm text-gray-500">{{ formatDate(ticket.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Create Ticket Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content max-w-2xl">
        <h3 class="text-xl font-semibold mb-6">Create Support Ticket</h3>
        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select v-model="form.category" required class="input">
              <option value="">Select category</option>
              <option value="ORDER">Order Issues</option>
              <option value="PAYMENT">Payment Issues</option>
              <option value="PRODUCT">Product Questions</option>
              <option value="ACCOUNT">Account Issues</option>
              <option value="TECHNICAL">Technical Problems</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select v-model="form.priority" required class="input">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input v-model="form.subject" type="text" required class="input" placeholder="Brief description of your issue" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea v-model="form.description" rows="6" required class="input" placeholder="Provide detailed information..."></textarea>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" :disabled="submitting" class="btn btn-primary flex-1">
              {{ submitting ? 'Submitting...' : 'Submit Ticket' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import supportService from '../services/supportService';
import { formatDate } from '../utils/helpers';

const tickets = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const form = ref({ category: '', priority: 'MEDIUM', subject: '', description: '' });

onMounted(() => {
  loadTickets();
});

async function loadTickets() {
  loading.value = true;
  try {
    const data = await supportService.getTickets();
    tickets.value = data.tickets || [];
  } catch (error) {
    console.error('Failed to load tickets:', error);
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  submitting.value = true;
  try {
    await supportService.createTicket(form.value);
    showCreateModal.value = false;
    form.value = { category: '', priority: 'MEDIUM', subject: '', description: '' };
    loadTickets();
  } catch (error) {
    console.error('Failed to create ticket:', error);
    alert('Failed to create ticket. Please try again.');
  } finally {
    submitting.value = false;
  }
}

function viewTicket(ticket) {
  alert(`Viewing ticket: ${ticket.subject}\n\nThis will be implemented to show full ticket details with replies.`);
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
</style>
