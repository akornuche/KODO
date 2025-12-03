<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Invoices</h1>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="card animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <div v-else-if="invoices.length === 0" class="card text-center py-12">
        <p class="text-gray-500">No invoices found</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="invoice in invoices" :key="invoice.id" class="card hover:shadow-lg transition-shadow">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 mb-1">Invoice #{{ invoice.invoiceNumber }}</h3>
              <p class="text-sm text-gray-600 mb-2">Order #{{ invoice.orderId }}</p>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-gray-700">{{ formatDate(invoice.createdAt) }}</span>
                <span class="font-semibold text-primary-600">{{ formatCurrency(invoice.totalAmount) }}</span>
              </div>
            </div>
            <button @click="downloadInvoice(invoice.id)" class="btn btn-primary btn-sm">
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import invoiceService from '../services/invoiceService';
import { formatCurrency, formatDate } from '../utils/helpers';

const invoices = ref([]);
const loading = ref(false);

onMounted(() => {
  loadInvoices();
});

async function loadInvoices() {
  loading.value = true;
  try {
    const data = await invoiceService.getInvoices();
    invoices.value = data.invoices || [];
  } catch (error) {
    console.error('Failed to load invoices:', error);
  } finally {
    loading.value = false;
  }
}

async function downloadInvoice(invoiceId) {
  try {
    const blob = await invoiceService.downloadInvoice(invoiceId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Failed to download invoice:', error);
    alert('Failed to download invoice. Please try again.');
  }
}
</script>

<style scoped>
.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
