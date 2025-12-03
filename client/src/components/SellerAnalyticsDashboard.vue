<template>
  <div class="seller-analytics-dashboard">
    <div class="dashboard-header">
      <h1>📊 Seller Analytics</h1>
      <div class="period-selector">
        <button
          v-for="p in periods"
          :key="p.value"
          @click="period = p.value; loadDashboard()"
          :class="{ active: period === p.value }"
          class="period-btn"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading analytics...</div>

    <div v-else-if="dashboardData" class="dashboard-content">
      <!-- Overview Cards -->
      <div class="stats-grid">
        <div class="stat-card revenue">
          <div class="stat-icon">💰</div>
          <div class="stat-details">
            <h3>Total Revenue</h3>
            <p class="stat-value">${{ formatNumber(dashboardData.overview.totalRevenue) }}</p>
            <span class="stat-period">Last {{ period }} days</span>
          </div>
        </div>

        <div class="stat-card orders">
          <div class="stat-icon">📦</div>
          <div class="stat-details">
            <h3>Total Orders</h3>
            <p class="stat-value">{{ dashboardData.overview.totalOrders }}</p>
            <span class="stat-period">Last {{ period }} days</span>
          </div>
        </div>

        <div class="stat-card avg-order">
          <div class="stat-icon">💵</div>
          <div class="stat-details">
            <h3>Avg Order Value</h3>
            <p class="stat-value">${{ formatNumber(dashboardData.overview.avgOrderValue) }}</p>
            <span class="stat-period">Per order</span>
          </div>
        </div>

        <div class="stat-card products">
          <div class="stat-icon">🏷️</div>
          <div class="stat-details">
            <h3>Active Products</h3>
            <p class="stat-value">{{ dashboardData.overview.totalProducts }}</p>
            <span class="stat-period">In catalog</span>
          </div>
        </div>

        <div class="stat-card views">
          <div class="stat-icon">👁️</div>
          <div class="stat-details">
            <h3>Product Views</h3>
            <p class="stat-value">{{ formatNumber(dashboardData.overview.productViews) }}</p>
            <span class="stat-period">Last {{ period }} days</span>
          </div>
        </div>

        <div class="stat-card rating">
          <div class="stat-icon">⭐</div>
          <div class="stat-details">
            <h3>Average Rating</h3>
            <p class="stat-value">{{ dashboardData.overview.avgRating.toFixed(1) }}</p>
            <span class="stat-period">{{ dashboardData.overview.totalReviews }} reviews</span>
          </div>
        </div>

        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-details">
            <h3>Pending Orders</h3>
            <p class="stat-value">{{ dashboardData.overview.pendingOrders }}</p>
            <span class="stat-period">Needs attention</span>
          </div>
        </div>

        <div class="stat-card stock">
          <div class="stat-icon">📉</div>
          <div class="stat-details">
            <h3>Low Stock Items</h3>
            <p class="stat-value">{{ dashboardData.overview.lowStockProducts }}</p>
            <span class="stat-period">≤ 10 items</span>
          </div>
        </div>
      </div>

      <!-- Revenue Chart -->
      <div class="chart-section">
        <h2>Revenue Over Time</h2>
        <div class="chart-wrapper">
          <canvas ref="revenueChart"></canvas>
        </div>
      </div>

      <!-- Top Products -->
      <div class="top-products-section">
        <h2>🏆 Top Selling Products</h2>
        <div class="products-list">
          <div
            v-for="(product, index) in dashboardData.topProducts"
            :key="product.id"
            class="product-item"
          >
            <div class="rank">#{index + 1}</div>
            <img :src="product.images?.[0] || '/placeholder.png'" :alt="product.name" />
            <div class="product-info">
              <h4>{{ product.name }}</h4>
              <p class="price">${{ product.price }}</p>
            </div>
            <div class="product-stats">
              <span class="sold">{{ product.quantitySold }} sold</span>
              <span class="revenue">${{ formatNumber(product.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <router-link to="/seller/products/new" class="action-card">
            <span class="action-icon">➕</span>
            <span>Add Product</span>
          </router-link>
          <router-link to="/seller/orders?status=pending" class="action-card">
            <span class="action-icon">📋</span>
            <span>View Pending Orders</span>
          </router-link>
          <router-link to="/seller/analytics/products" class="action-card">
            <span class="action-icon">📊</span>
            <span>Product Performance</span>
          </router-link>
          <router-link to="/seller/analytics/customers" class="action-card">
            <span class="action-icon">👥</span>
            <span>Customer Insights</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import sellerAnalyticsService from '@/services/sellerAnalyticsService';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const loading = ref(true);
const dashboardData = ref(null);
const period = ref(30);
const revenueChart = ref(null);
let chartInstance = null;

const periods = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: '1 Year', value: 365 },
];

const loadDashboard = async () => {
  loading.value = true;
  try {
    const data = await sellerAnalyticsService.getSellerDashboard(period.value);
    dashboardData.value = data;
    await nextTick();
    renderRevenueChart();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  } finally {
    loading.value = false;
  }
};

const renderRevenueChart = () => {
  if (!revenueChart.value || !dashboardData.value?.revenueByDay) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = revenueChart.value.getContext('2d');
  const data = dashboardData.value.revenueByDay;

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Revenue',
          data: data.map(d => d.revenue),
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Orders',
          data: data.map(d => d.orders),
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Revenue ($)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Orders',
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
};

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
.seller-analytics-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.period-selector {
  display: flex;
  gap: 0.5rem;
}

.period-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn:hover {
  border-color: #007bff;
}

.period-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-details h3 {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.stat-period {
  font-size: 0.75rem;
  color: #999;
}

.chart-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.chart-wrapper {
  height: 400px;
  margin-top: 1rem;
}

.top-products-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.product-item:hover {
  background: #e9ecef;
}

.rank {
  font-size: 1.5rem;
  font-weight: 700;
  color: #007bff;
  width: 40px;
}

.product-item img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.product-info {
  flex: 1;
}

.product-info h4 {
  margin-bottom: 0.25rem;
}

.product-info .price {
  color: #28a745;
  font-weight: 600;
}

.product-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.sold {
  color: #666;
  font-size: 0.875rem;
}

.revenue {
  font-size: 1.25rem;
  font-weight: 700;
  color: #007bff;
}

.quick-actions {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s;
}

.action-card:hover {
  background: #007bff;
  color: white;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
}
</style>
