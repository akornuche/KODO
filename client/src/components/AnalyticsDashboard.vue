<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <h1>Analytics Dashboard</h1>
      <div class="header-controls">
        <select v-model="dateRange" @change="fetchAnalytics" class="date-range-selector">
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
        
        <button @click="exportData" class="btn-export">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
        
        <button @click="refreshData" class="btn-refresh" :disabled="loading">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Key Metrics Cards -->
    <div class="metrics-grid">
      <div v-for="metric in keyMetrics" :key="metric.key" class="metric-card">
        <div class="metric-icon" :class="`bg-${metric.color}`">
          <component :is="metric.icon" />
        </div>
        <div class="metric-content">
          <p class="metric-label">{{ metric.label }}</p>
          <h3 class="metric-value">{{ formatValue(metric.value, metric.format) }}</h3>
          <div class="metric-change" :class="metric.change >= 0 ? 'positive' : 'negative'">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="metric.change >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"/>
            </svg>
            {{ Math.abs(metric.change) }}% vs previous period
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="charts-row">
      <div class="chart-card large">
        <div class="chart-header">
          <h3>Revenue Overview</h3>
          <div class="chart-controls">
            <button 
              v-for="view in ['daily', 'weekly', 'monthly']" 
              :key="view"
              @click="revenueView = view"
              :class="['chart-view-btn', { active: revenueView === view }]"
            >
              {{ view }}
            </button>
          </div>
        </div>
        <div class="chart-container">
          <canvas ref="revenueChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>Order Status</h3>
        </div>
        <div class="chart-container">
          <canvas ref="orderStatusChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <h3>Top Products</h3>
        </div>
        <div class="top-products-list">
          <div v-for="(product, index) in topProducts" :key="product.id" class="product-item">
            <span class="product-rank">#{{ index + 1 }}</span>
            <div class="product-info">
              <p class="product-name">{{ product.name }}</p>
              <p class="product-stats">{{ product.sales }} sales · ${{ product.revenue.toLocaleString() }}</p>
            </div>
            <div class="product-bar">
              <div class="product-bar-fill" :style="{ width: `${(product.sales / topProducts[0].sales) * 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>Traffic Sources</h3>
        </div>
        <div class="chart-container">
          <canvas ref="trafficChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>User Activity</h3>
        </div>
        <div class="chart-container">
          <canvas ref="activityChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Detailed Tables -->
    <div class="charts-row">
      <div class="chart-card full-width">
        <div class="chart-header">
          <h3>Recent Transactions</h3>
          <button @click="viewAllTransactions" class="btn-link">View All →</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in recentTransactions" :key="transaction.id">
                <td><code>{{ transaction.orderId }}</code></td>
                <td>{{ transaction.customer }}</td>
                <td>{{ transaction.product }}</td>
                <td>${{ transaction.amount.toFixed(2) }}</td>
                <td><span :class="`status-badge status-${transaction.status.toLowerCase()}`">{{ transaction.status }}</span></td>
                <td>{{ formatDate(transaction.date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Real-time Metrics -->
    <div class="realtime-section">
      <h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
        </svg>
        Real-time Metrics
      </h3>
      <div class="realtime-grid">
        <div class="realtime-card">
          <p class="realtime-label">Active Users</p>
          <h2 class="realtime-value">{{ realtimeMetrics.activeUsers }}</h2>
        </div>
        <div class="realtime-card">
          <p class="realtime-label">Active Orders</p>
          <h2 class="realtime-value">{{ realtimeMetrics.activeOrders }}</h2>
        </div>
        <div class="realtime-card">
          <p class="realtime-label">Pending Deliveries</p>
          <h2 class="realtime-value">{{ realtimeMetrics.pendingDeliveries }}</h2>
        </div>
        <div class="realtime-card">
          <p class="realtime-label">Today's Revenue</p>
          <h2 class="realtime-value">${{ realtimeMetrics.todayRevenue.toLocaleString() }}</h2>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import api from '../services/api';

export default {
  name: 'AnalyticsDashboard',
  
  setup() {
    const loading = ref(false);
    const dateRange = ref('30d');
    const revenueView = ref('daily');
    
    const keyMetrics = ref([
      { key: 'revenue', label: 'Total Revenue', value: 0, change: 0, format: 'currency', color: 'blue', icon: 'DollarIcon' },
      { key: 'orders', label: 'Total Orders', value: 0, change: 0, format: 'number', color: 'green', icon: 'OrderIcon' },
      { key: 'customers', label: 'Active Customers', value: 0, change: 0, format: 'number', color: 'purple', icon: 'UserIcon' },
      { key: 'avgOrder', label: 'Avg Order Value', value: 0, change: 0, format: 'currency', color: 'orange', icon: 'TrendIcon' },
    ]);

    const topProducts = ref([]);
    const recentTransactions = ref([]);
    
    const realtimeMetrics = ref({
      activeUsers: 0,
      activeOrders: 0,
      pendingDeliveries: 0,
      todayRevenue: 0,
    });

    // Chart instances
    const charts = ref({
      revenue: null,
      orderStatus: null,
      traffic: null,
      activity: null,
    });

    const revenueChart = ref(null);
    const orderStatusChart = ref(null);
    const trafficChart = ref(null);
    const activityChart = ref(null);

    const formatValue = (value, format) => {
      if (format === 'currency') {
        return `$${value.toLocaleString()}`;
      }
      if (format === 'percentage') {
        return `${value}%`;
      }
      return value.toLocaleString();
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    const fetchAnalytics = async () => {
      loading.value = true;
      try {
        // Fetch dashboard data
        const dashboardResponse = await api.get('/analytics/dashboard', {
          params: { range: dateRange.value }
        });

        const data = dashboardResponse.data;

        // Update key metrics
        keyMetrics.value[0].value = data.totalRevenue || 0;
        keyMetrics.value[0].change = data.revenueChange || 0;
        keyMetrics.value[1].value = data.totalOrders || 0;
        keyMetrics.value[1].change = data.ordersChange || 0;
        keyMetrics.value[2].value = data.activeCustomers || 0;
        keyMetrics.value[2].change = data.customersChange || 0;
        keyMetrics.value[3].value = data.avgOrderValue || 0;
        keyMetrics.value[3].change = data.avgOrderChange || 0;

        // Fetch product analytics
        const productsResponse = await api.get('/analytics/products');
        topProducts.value = productsResponse.data.topProducts || [];

        // Fetch sales analytics
        const salesResponse = await api.get('/analytics/sales');
        recentTransactions.value = salesResponse.data.recentTransactions || [];

        // Update charts
        updateCharts(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        loading.value = false;
      }
    };

    const fetchRealtimeMetrics = async () => {
      try {
        const response = await api.get('/analytics/realtime');
        realtimeMetrics.value = response.data;
      } catch (error) {
        console.error('Failed to fetch realtime metrics:', error);
      }
    };

    const updateCharts = (data) => {
      // Revenue Chart
      if (revenueChart.value) {
        if (charts.value.revenue) {
          charts.value.revenue.destroy();
        }
        
        const ctx = revenueChart.value.getContext('2d');
        charts.value.revenue = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.revenueLabels || [],
            datasets: [{
              label: 'Revenue',
              data: data.revenueData || [],
              borderColor: '#007bff',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              fill: true,
              tension: 0.4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => '$' + value.toLocaleString()
                }
              }
            }
          }
        });
      }

      // Order Status Chart
      if (orderStatusChart.value) {
        if (charts.value.orderStatus) {
          charts.value.orderStatus.destroy();
        }
        
        const ctx = orderStatusChart.value.getContext('2d');
        charts.value.orderStatus = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Completed', 'Pending', 'Processing', 'Cancelled'],
            datasets: [{
              data: data.orderStatusData || [0, 0, 0, 0],
              backgroundColor: ['#28a745', '#ffc107', '#007bff', '#dc3545'],
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
            }
          }
        });
      }

      // Traffic Sources Chart
      if (trafficChart.value) {
        if (charts.value.traffic) {
          charts.value.traffic.destroy();
        }
        
        const ctx = trafficChart.value.getContext('2d');
        charts.value.traffic = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Direct', 'Search', 'Social', 'Referral'],
            datasets: [{
              data: data.trafficData || [0, 0, 0, 0],
              backgroundColor: ['#007bff', '#28a745', '#dc3545', '#ffc107'],
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
            }
          }
        });
      }

      // User Activity Chart
      if (activityChart.value) {
        if (charts.value.activity) {
          charts.value.activity.destroy();
        }
        
        const ctx = activityChart.value.getContext('2d');
        charts.value.activity = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.activityLabels || [],
            datasets: [{
              label: 'Active Users',
              data: data.activityData || [],
              backgroundColor: '#6f42c1',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }
    };

    const exportData = async () => {
      try {
        const response = await api.get('/analytics/export', {
          params: { range: dateRange.value },
          responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Failed to export data:', error);
      }
    };

    const refreshData = () => {
      fetchAnalytics();
      fetchRealtimeMetrics();
    };

    const viewAllTransactions = () => {
      // Navigate to transactions page
      window.location.href = '/transactions';
    };

    let realtimeInterval;

    onMounted(() => {
      fetchAnalytics();
      fetchRealtimeMetrics();
      
      // Update realtime metrics every 10 seconds
      realtimeInterval = setInterval(fetchRealtimeMetrics, 10000);
    });

    onUnmounted(() => {
      // Cleanup charts
      Object.values(charts.value).forEach(chart => {
        if (chart) chart.destroy();
      });
      
      // Clear interval
      if (realtimeInterval) {
        clearInterval(realtimeInterval);
      }
    });

    return {
      loading,
      dateRange,
      revenueView,
      keyMetrics,
      topProducts,
      recentTransactions,
      realtimeMetrics,
      revenueChart,
      orderStatusChart,
      trafficChart,
      activityChart,
      formatValue,
      formatDate,
      fetchAnalytics,
      exportData,
      refreshData,
      viewAllTransactions,
    };
  },
};
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 28px;
}

.header-controls {
  display: flex;
  gap: 10px;
}

.date-range-selector {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-export,
.btn-refresh {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-export:hover,
.btn-refresh:hover:not(:disabled) {
  border-color: #007bff;
  color: #007bff;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.bg-blue { background: #007bff; }
.bg-green { background: #28a745; }
.bg-purple { background: #6f42c1; }
.bg-orange { background: #fd7e14; }

.metric-content {
  flex: 1;
}

.metric-label {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #6c757d;
}

.metric-value {
  margin: 0 0 5px 0;
  font-size: 24px;
  font-weight: 700;
}

.metric-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-change.positive {
  color: #28a745;
}

.metric-change.negative {
  color: #dc3545;
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-card.large {
  grid-column: span 2;
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
}

.chart-controls {
  display: flex;
  gap: 5px;
}

.chart-view-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.3s;
}

.chart-view-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.chart-container {
  height: 300px;
  position: relative;
}

.top-products-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.product-item {
  display: grid;
  grid-template-columns: 30px 1fr 100px;
  gap: 10px;
  align-items: center;
}

.product-rank {
  font-weight: 700;
  font-size: 18px;
  color: #6c757d;
}

.product-info {
  flex: 1;
}

.product-name {
  margin: 0 0 4px 0;
  font-weight: 600;
}

.product-stats {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.product-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.product-bar-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.5s;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px;
  background: #f8f9fa;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  font-size: 14px;
}

.data-table code {
  padding: 2px 6px;
  background: #f8f9fa;
  border-radius: 3px;
  font-size: 12px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-processing {
  background: #cce5ff;
  color: #004085;
}

.status-cancelled {
  background: #f8d7da;
  color: #721c24;
}

.btn-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
}

.btn-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.realtime-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.realtime-section h3 {
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.realtime-section svg {
  color: #28a745;
}

.realtime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.realtime-card {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #28a745;
}

.realtime-label {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6c757d;
}

.realtime-value {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #28a745;
}

@media (max-width: 1200px) {
  .chart-card.large {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
