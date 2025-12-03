<template>
  <div class="fraud-detection">
    <div class="fraud-header">
      <h1>🛡️ Fraud Detection Dashboard</h1>
      <p>Monitor and manage suspicious activity</p>
    </div>

    <!-- Overview Stats -->
    <div class="stats-grid">
      <div class="stat-card alert">
        <div class="stat-icon">⚠️</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.alertsToday }}</div>
          <div class="stat-label">Alerts Today</div>
        </div>
      </div>

      <div class="stat-card blocked">
        <div class="stat-icon">🚫</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.blockedUsers }}</div>
          <div class="stat-label">Blocked Users</div>
        </div>
      </div>

      <div class="stat-card prevented">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-value">${{ stats.preventedLosses }}</div>
          <div class="stat-label">Prevented Losses</div>
        </div>
      </div>

      <div class="stat-card score">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.avgRiskScore }}%</div>
          <div class="stat-label">Avg Risk Score</div>
        </div>
      </div>
    </div>

    <!-- Active Alerts -->
    <div class="alerts-section">
      <div class="section-header">
        <h2>🚨 Active Alerts</h2>
        <button @click="loadAlerts" class="btn btn-secondary btn-sm">
          🔄 Refresh
        </button>
      </div>

      <div v-if="alerts.length" class="alerts-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-card"
          :class="getRiskClass(alert.riskScore)"
        >
          <div class="alert-header">
            <div class="alert-info">
              <h3>{{ alert.type }}</h3>
              <p class="alert-time">{{ formatDateTime(alert.createdAt) }}</p>
            </div>
            <div class="risk-badge" :class="getRiskClass(alert.riskScore)">
              Risk: {{ alert.riskScore }}%
            </div>
          </div>

          <div class="alert-details">
            <div class="detail-row">
              <span class="label">User ID:</span>
              <span class="value">{{ alert.userId }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Order ID:</span>
              <span class="value">{{ alert.orderId || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">IP Address:</span>
              <span class="value">{{ alert.ipAddress }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Reason:</span>
              <span class="value">{{ alert.reason }}</span>
            </div>
          </div>

          <div class="alert-flags">
            <span
              v-for="flag in alert.flags"
              :key="flag"
              class="flag-badge"
            >
              {{ flag }}
            </span>
          </div>

          <div class="alert-actions">
            <button
              @click="viewDetails(alert)"
              class="btn btn-secondary btn-sm"
            >
              👁️ View Details
            </button>
            <button
              @click="dismissAlert(alert.id)"
              class="btn btn-success btn-sm"
            >
              ✓ Dismiss
            </button>
            <button
              @click="blockUser(alert.userId)"
              class="btn btn-danger btn-sm"
            >
              🚫 Block User
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">✅</div>
        <p>No active fraud alerts</p>
      </div>
    </div>

    <!-- Order Analysis Tool -->
    <div class="analysis-section">
      <h2>🔍 Analyze Order</h2>
      <div class="analysis-form">
        <div class="form-group">
          <input
            type="text"
            v-model="analyzeOrderId"
            placeholder="Enter Order ID"
          />
        </div>
        <button
          @click="analyzeOrder"
          :disabled="!analyzeOrderId || analyzing"
          class="btn btn-primary"
        >
          <span v-if="analyzing">
            <span class="spinner-small"></span>
            Analyzing...
          </span>
          <span v-else>
            🔍 Analyze
          </span>
        </button>
      </div>

      <div v-if="analysisResult" class="analysis-result">
        <div class="result-header" :class="getAnalysisClass(analysisResult.riskScore)">
          <h3>Risk Score: {{ analysisResult.riskScore }}%</h3>
          <p>{{ getRiskLevel(analysisResult.riskScore) }}</p>
        </div>

        <div class="result-details">
          <h4>Risk Factors:</h4>
          <ul class="risk-factors">
            <li v-for="factor in analysisResult.factors" :key="factor">
              {{ factor }}
            </li>
          </ul>

          <div v-if="analysisResult.recommendation" class="recommendation">
            <strong>Recommendation:</strong>
            <p>{{ analysisResult.recommendation }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="selectedAlert" class="modal-overlay" @click="selectedAlert = null">
      <div class="modal" @click.stop>
        <h2>Alert Details</h2>

        <div class="modal-content">
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Alert ID:</strong>
              <span>{{ selectedAlert.id }}</span>
            </div>
            <div class="detail-item">
              <strong>Type:</strong>
              <span>{{ selectedAlert.type }}</span>
            </div>
            <div class="detail-item">
              <strong>Risk Score:</strong>
              <span class="risk-value">{{ selectedAlert.riskScore }}%</span>
            </div>
            <div class="detail-item">
              <strong>Created:</strong>
              <span>{{ formatDateTime(selectedAlert.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <strong>User ID:</strong>
              <span>{{ selectedAlert.userId }}</span>
            </div>
            <div class="detail-item">
              <strong>IP Address:</strong>
              <span>{{ selectedAlert.ipAddress }}</span>
            </div>
            <div class="detail-item full-width">
              <strong>Reason:</strong>
              <p>{{ selectedAlert.reason }}</p>
            </div>
            <div v-if="selectedAlert.details" class="detail-item full-width">
              <strong>Additional Details:</strong>
              <pre>{{ JSON.stringify(selectedAlert.details, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <button @click="selectedAlert = null" class="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { enhancedFeaturesService } from '@/services/enhancedFeaturesService';
import { useToast } from 'vue-toastification';

const toast = useToast();

const stats = ref({
  alertsToday: 0,
  blockedUsers: 0,
  preventedLosses: 0,
  avgRiskScore: 0,
});

const alerts = ref([]);
const analyzeOrderId = ref('');
const analyzing = ref(false);
const analysisResult = ref(null);
const selectedAlert = ref(null);

const getRiskClass = (score) => {
  if (score >= 80) return 'risk-critical';
  if (score >= 60) return 'risk-high';
  if (score >= 40) return 'risk-medium';
  return 'risk-low';
};

const getAnalysisClass = (score) => {
  if (score >= 70) return 'danger';
  if (score >= 40) return 'warning';
  return 'safe';
};

const getRiskLevel = (score) => {
  if (score >= 80) return 'CRITICAL - Immediate action required';
  if (score >= 60) return 'HIGH - Review carefully';
  if (score >= 40) return 'MEDIUM - Monitor closely';
  return 'LOW - Appears safe';
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadStats = async () => {
  try {
    const data = await enhancedFeaturesService.fraudDetectionService.getStats();
    stats.value = data;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const loadAlerts = async () => {
  try {
    const data = await enhancedFeaturesService.fraudDetectionService.getAlerts();
    alerts.value = data;
  } catch (error) {
    console.error('Error loading alerts:', error);
    toast.error('Failed to load alerts');
  }
};

const analyzeOrder = async () => {
  if (!analyzeOrderId.value) return;

  analyzing.value = true;
  try {
    const data = await enhancedFeaturesService.fraudDetectionService.analyze(
      analyzeOrderId.value
    );
    analysisResult.value = data;
  } catch (error) {
    console.error('Error analyzing order:', error);
    toast.error('Failed to analyze order');
    analysisResult.value = null;
  } finally {
    analyzing.value = false;
  }
};

const dismissAlert = async (alertId) => {
  try {
    // This would call an API to dismiss the alert
    alerts.value = alerts.value.filter((a) => a.id !== alertId);
    toast.success('Alert dismissed');
  } catch (error) {
    console.error('Error dismissing alert:', error);
    toast.error('Failed to dismiss alert');
  }
};

const blockUser = async (userId) => {
  if (!confirm('Are you sure you want to block this user?')) {
    return;
  }

  try {
    await enhancedFeaturesService.fraudDetectionService.blockUser(userId);
    toast.success('User blocked successfully');
    loadAlerts();
  } catch (error) {
    console.error('Error blocking user:', error);
    toast.error('Failed to block user');
  }
};

const viewDetails = (alert) => {
  selectedAlert.value = alert;
};

onMounted(() => {
  loadStats();
  loadAlerts();
});
</script>

<style scoped>
.fraud-detection {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.fraud-header {
  text-align: center;
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.stat-card.alert .stat-value {
  color: #ffc107;
}

.stat-card.blocked .stat-value {
  color: #dc3545;
}

.stat-card.prevented .stat-value {
  color: #28a745;
}

.stat-card.score .stat-value {
  color: #007bff;
}

.alerts-section,
.analysis-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.alert-card {
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 6px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-card.risk-low {
  border-color: #28a745;
  background: #f8fff9;
}

.alert-card.risk-medium {
  border-color: #ffc107;
  background: #fffbf0;
}

.alert-card.risk-high {
  border-color: #ff6b6b;
  background: #fff5f5;
}

.alert-card.risk-critical {
  border-color: #dc3545;
  background: #ffe6e6;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.alert-info h3 {
  margin-bottom: 0.25rem;
  color: #333;
}

.alert-time {
  color: #666;
  font-size: 0.875rem;
}

.risk-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.875rem;
}

.risk-badge.risk-low {
  background: #28a745;
  color: white;
}

.risk-badge.risk-medium {
  background: #ffc107;
  color: #000;
}

.risk-badge.risk-high {
  background: #ff6b6b;
  color: white;
}

.risk-badge.risk-critical {
  background: #dc3545;
  color: white;
}

.alert-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-row .label {
  color: #666;
  font-weight: 600;
}

.alert-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.flag-badge {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.analysis-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  flex: 1;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.analysis-result {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-header {
  padding: 1.5rem;
  color: white;
  text-align: center;
}

.result-header.safe {
  background: #28a745;
}

.result-header.warning {
  background: #ffc107;
  color: #000;
}

.result-header.danger {
  background: #dc3545;
}

.result-details {
  padding: 1.5rem;
  background: white;
}

.risk-factors {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.risk-factors li {
  padding: 0.75rem;
  background: #f8f9fa;
  border-left: 4px solid #ffc107;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.recommendation {
  padding: 1rem;
  background: #e7f3ff;
  border-left: 4px solid #007bff;
  border-radius: 4px;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
}

.risk-value {
  color: #dc3545;
  font-weight: 700;
}

pre {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
}
</style>
