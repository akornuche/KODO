<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="card">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">📊 Reports</h1>

        <!-- Report Type Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Report Type
          </label>
          <select v-model="reportType" class="input max-w-md">
            <option value="sales" v-if="canViewSalesReports">Sales Report</option>
            <option value="orders">Orders Report</option>
            <option value="deliveries" v-if="canViewDeliveryReports">Delivery Report</option>
            <option value="users" v-if="isAdmin">User Activity Report</option>
          </select>
        </div>

        <!-- Date Range -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              v-model="startDate"
              type="date"
              class="input"
              :max="today"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              v-model="endDate"
              type="date"
              class="input"
              :max="today"
              :min="startDate"
              required
            />
          </div>
        </div>

        <!-- Additional Filters -->
        <div class="mb-6" v-if="reportType === 'orders'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Order Status (Optional)
          </label>
          <select v-model="orderStatus" class="input max-w-md">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div class="mb-6" v-if="reportType === 'users' && isAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            User Role (Optional)
          </label>
          <select v-model="userRole" class="input max-w-md">
            <option value="">All Roles</option>
            <option value="buyer">Buyers</option>
            <option value="seller">Sellers</option>
            <option value="courier">Couriers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <!-- Export Format -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div class="flex gap-4">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="exportFormat"
                value="json"
                class="mr-2"
              />
              <span>Preview (JSON)</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="exportFormat"
                value="pdf"
                class="mr-2"
              />
              <span>PDF</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="exportFormat"
                value="csv"
                class="mr-2"
              />
              <span>CSV</span>
            </label>
          </div>
        </div>

        <!-- Generate Button -->
        <button
          @click="generateReport"
          :disabled="loading || !startDate || !endDate"
          class="btn btn-primary"
        >
          <span v-if="loading">
            <svg class="animate-spin h-5 w-5 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </span>
          <span v-else>
            Generate Report
          </span>
        </button>

        <!-- Error Message -->
        <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {{ error }}
        </div>

        <!-- JSON Preview -->
        <div v-if="reportData && exportFormat === 'json'" class="mt-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Report Preview</h2>
            <button
              @click="downloadJSON"
              class="btn btn-secondary text-sm"
            >
              Download JSON
            </button>
          </div>

          <!-- Summary Stats -->
          <div v-if="reportData.summary" class="grid md:grid-cols-4 gap-4 mb-6">
            <div
              v-for="(value, key) in reportData.summary"
              :key="key"
              class="bg-primary-50 p-4 rounded-lg"
            >
              <div class="text-sm text-gray-600 capitalize">
                {{ formatKey(key) }}
              </div>
              <div class="text-2xl font-bold text-primary-700 mt-1">
                {{ formatValue(value) }}
              </div>
            </div>
          </div>

          <!-- Data Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    v-for="(value, key) in getTableHeaders()"
                    :key="key"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {{ formatKey(key) }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(row, index) in getTableData()" :key="index">
                  <td
                    v-for="(value, key) in row"
                    :key="key"
                    class="px-4 py-3 text-sm text-gray-900"
                  >
                    {{ formatValue(value) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No Data Message -->
          <div
            v-if="getTableData().length === 0"
            class="text-center py-8 text-gray-500"
          >
            No data available for the selected period
          </div>
        </div>
      </div>

      <!-- Quick Stats Dashboard -->
      <div v-if="dashboardStats" class="mt-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
        <div class="grid md:grid-cols-4 gap-4">
          <div
            v-for="(value, key) in dashboardStats"
            :key="key"
            class="card"
          >
            <div class="text-sm text-gray-600 capitalize">
              {{ formatKey(key) }}
            </div>
            <div class="text-3xl font-bold text-gray-900 mt-2">
              {{ formatValue(value) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();

const reportType = ref('sales');
const startDate = ref('');
const endDate = ref('');
const orderStatus = ref('');
const userRole = ref('');
const exportFormat = ref('json');
const loading = ref(false);
const error = ref(null);
const reportData = ref(null);
const dashboardStats = ref(null);

// Computed
const isAdmin = computed(() => authStore.user?.role === 'admin');
const isSeller = computed(() => authStore.user?.role === 'seller');
const isCourier = computed(() => authStore.user?.role === 'courier');

const canViewSalesReports = computed(() => isAdmin.value || isSeller.value);
const canViewDeliveryReports = computed(() => isAdmin.value || isCourier.value);

const today = computed(() => {
  return new Date().toISOString().split('T')[0];
});

// Set default dates (last 30 days)
onMounted(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  endDate.value = end.toISOString().split('T')[0];
  startDate.value = start.toISOString().split('T')[0];

  // Set default report type based on role
  if (isSeller.value) {
    reportType.value = 'sales';
  } else if (isCourier.value) {
    reportType.value = 'deliveries';
  } else {
    reportType.value = 'orders';
  }

  fetchDashboardStats();
});

// Methods
const generateReport = async () => {
  if (!startDate.value || !endDate.value) {
    error.value = 'Please select both start and end dates';
    return;
  }

  loading.value = true;
  error.value = null;
  reportData.value = null;

  try {
    const payload = {
      startDate: startDate.value,
      endDate: endDate.value,
      format: exportFormat.value,
    };

    // Add additional filters
    if (reportType.value === 'orders' && orderStatus.value) {
      payload.status = orderStatus.value;
    }
    if (reportType.value === 'users' && userRole.value) {
      payload.role = userRole.value;
    }

    const response = await api.post(`/api/reports/${reportType.value}`, payload, {
      responseType: exportFormat.value === 'json' ? 'json' : 'blob',
    });

    if (exportFormat.value === 'json') {
      reportData.value = response.data.report;
    } else {
      // Handle file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType.value}-report-${Date.now()}.${exportFormat.value}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Report generation error:', err);
    error.value = err.response?.data?.message || 'Failed to generate report';
  } finally {
    loading.value = false;
  }
};

const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/api/reports/dashboard');
    dashboardStats.value = response.data.stats;
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
  }
};

const downloadJSON = () => {
  const dataStr = JSON.stringify(reportData.value, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportType.value}-report-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const getTableHeaders = () => {
  if (!reportData.value) return {};
  
  const dataArray = getDataArray();
  if (dataArray.length === 0) return {};
  
  return dataArray[0];
};

const getTableData = () => {
  if (!reportData.value) return [];
  return getDataArray();
};

const getDataArray = () => {
  if (!reportData.value) return [];
  
  // Different report types have different data structures
  if (reportData.value.orders) return reportData.value.orders;
  if (reportData.value.deliveries) return reportData.value.deliveries;
  if (reportData.value.users) return reportData.value.users;
  
  return [];
};

const formatKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'number' && value > 1000) {
    return value.toLocaleString();
  }
  return value;
};
</script>
