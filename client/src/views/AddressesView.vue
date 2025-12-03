<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Shipping Addresses</h1>
          <p class="text-gray-600 mt-1">Manage your delivery addresses</p>
        </div>
        <button @click="showAddModal = true" class="btn btn-primary">
          + Add Address
        </button>
      </div>

      <!-- Addresses List -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>

      <div v-else-if="addresses.length === 0" class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-gray-500">No addresses saved yet</p>
        <button @click="showAddModal = true" class="btn btn-primary mt-4">
          Add Your First Address
        </button>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="address in addresses"
          :key="address.id"
          class="card hover:shadow-lg transition-shadow"
          :class="{ 'border-2 border-primary-500': address.isDefault }"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-gray-900">{{ address.label || 'Address' }}</h3>
                <span v-if="address.isDefault" class="badge-primary text-xs">Default</span>
              </div>
              <p class="text-gray-700">{{ address.fullName }}</p>
              <p class="text-gray-600 text-sm">{{ address.phone }}</p>
              <p class="text-gray-600 text-sm mt-2">
                {{ address.street }}, {{ address.city }}, {{ address.state }} {{ address.zipCode }}
              </p>
            </div>

            <div class="flex gap-2">
              <button @click="editAddress(address)" class="btn btn-secondary btn-sm">
                Edit
              </button>
              <button @click="deleteAddress(address.id)" class="btn bg-red-100 hover:bg-red-200 text-red-600 btn-sm">
                Delete
              </button>
            </div>
          </div>

          <div v-if="!address.isDefault" class="mt-4">
            <button @click="setDefault(address.id)" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Set as Default
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Address Modal -->
    <div v-if="showAddModal || editingAddress" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold">{{ editingAddress ? 'Edit' : 'Add' }} Address</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Label</label>
              <input v-model="form.label" type="text" required class="input" placeholder="Home, Work, etc." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input v-model="form.fullName" type="text" required class="input" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input v-model="form.phone" type="tel" required class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Alternative Phone</label>
              <input v-model="form.alternativePhone" type="tel" class="input" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
            <input v-model="form.street" type="text" required class="input" />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input v-model="form.city" type="text" required class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input v-model="form.state" type="text" required class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
              <input v-model="form.zipCode" type="text" required class="input" />
            </div>
          </div>

          <div>
            <label class="flex items-center">
              <input v-model="form.isDefault" type="checkbox" class="rounded border-gray-300 text-primary-600" />
              <span class="ml-2 text-sm text-gray-700">Set as default address</span>
            </label>
          </div>

          <div class="flex gap-3 pt-4">
            <button type="button" @click="closeModal" class="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" :disabled="submitting" class="btn btn-primary flex-1">
              {{ submitting ? 'Saving...' : 'Save Address' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import addressService from '../services/addressService';

const addresses = ref([]);
const loading = ref(false);
const submitting = ref(false);
const showAddModal = ref(false);
const editingAddress = ref(null);

const form = ref({
  label: '',
  fullName: '',
  phone: '',
  alternativePhone: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  isDefault: false,
});

onMounted(() => {
  loadAddresses();
});

async function loadAddresses() {
  loading.value = true;
  try {
    const data = await addressService.getAddresses();
    addresses.value = data.addresses || [];
  } catch (error) {
    console.error('Failed to load addresses:', error);
  } finally {
    loading.value = false;
  }
}

function editAddress(address) {
  editingAddress.value = address;
  form.value = { ...address };
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (editingAddress.value) {
      await addressService.updateAddress(editingAddress.value.id, form.value);
    } else {
      await addressService.createAddress(form.value);
    }
    closeModal();
    loadAddresses();
  } catch (error) {
    console.error('Failed to save address:', error);
    alert('Failed to save address. Please try again.');
  } finally {
    submitting.value = false;
  }
}

async function deleteAddress(id) {
  if (!confirm('Are you sure you want to delete this address?')) return;

  try {
    await addressService.deleteAddress(id);
    loadAddresses();
  } catch (error) {
    console.error('Failed to delete address:', error);
    alert('Failed to delete address. Please try again.');
  }
}

async function setDefault(id) {
  try {
    await addressService.setDefaultAddress(id);
    loadAddresses();
  } catch (error) {
    console.error('Failed to set default address:', error);
    alert('Failed to update default address. Please try again.');
  }
}

function closeModal() {
  showAddModal.value = false;
  editingAddress.value = null;
  form.value = {
    label: '',
    fullName: '',
    phone: '',
    alternativePhone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  };
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
