<template>
  <div class="gdpr-settings">
    <div class="settings-header">
      <h1>🔒 Privacy & Data Settings</h1>
      <p>Manage your data, privacy, and GDPR rights</p>
    </div>

    <div class="settings-grid">
      <!-- Consent Management -->
      <div class="settings-card">
        <h2>📋 Consent Preferences</h2>
        <p class="card-description">
          Control how we use your data
        </p>

        <div v-if="consentData" class="consent-options">
          <div
            v-for="(value, key) in consentData"
            :key="key"
            class="consent-item"
          >
            <label class="switch">
              <input
                type="checkbox"
                :checked="value"
                @change="updateConsent(key, $event.target.checked)"
              />
              <span class="slider"></span>
            </label>
            <div class="consent-info">
              <strong>{{ formatConsentKey(key) }}</strong>
              <p>{{ getConsentDescription(key) }}</p>
            </div>
          </div>
        </div>

        <button @click="saveConsent" class="btn btn-primary">
          💾 Save Preferences
        </button>
      </div>

      <!-- Data Export -->
      <div class="settings-card">
        <h2>📦 Export Your Data</h2>
        <p class="card-description">
          Download a copy of all your personal data
        </p>

        <div v-if="exportRequests.length" class="export-history">
          <h3>Recent Exports</h3>
          <ul class="export-list">
            <li
              v-for="request in exportRequests"
              :key="request.id"
              class="export-item"
            >
              <div class="export-info">
                <span class="export-date">
                  {{ formatDateTime(request.requestedAt) }}
                </span>
                <span
                  class="export-status"
                  :class="'status-' + request.status"
                >
                  {{ request.status }}
                </span>
              </div>
              <button
                v-if="request.status === 'completed'"
                @click="downloadExport(request.id)"
                class="btn btn-sm"
              >
                ⬇️ Download
              </button>
            </li>
          </ul>
        </div>

        <button
          @click="requestExport"
          :disabled="exportPending"
          class="btn btn-primary"
        >
          <span v-if="exportPending">
            <span class="spinner-small"></span>
            Processing...
          </span>
          <span v-else>
            📤 Request Data Export
          </span>
        </button>

        <p class="help-text">
          Your data will be prepared and available for download within 48 hours
        </p>
      </div>

      <!-- Data Rectification -->
      <div class="settings-card">
        <h2>✏️ Correct Your Data</h2>
        <p class="card-description">
          Request corrections to your personal information
        </p>

        <form @submit.prevent="submitRectification" class="rectification-form">
          <div class="form-group">
            <label>Field to Correct</label>
            <select v-model="rectificationForm.field" required>
              <option value="">Select a field...</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone Number</option>
              <option value="address">Address</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label>Current Value</label>
            <input
              type="text"
              v-model="rectificationForm.currentValue"
              required
            />
          </div>

          <div class="form-group">
            <label>Corrected Value</label>
            <input
              type="text"
              v-model="rectificationForm.correctedValue"
              required
            />
          </div>

          <div class="form-group">
            <label>Reason for Correction</label>
            <textarea
              v-model="rectificationForm.reason"
              rows="3"
              required
            ></textarea>
          </div>

          <button type="submit" class="btn btn-primary">
            📨 Submit Request
          </button>
        </form>
      </div>

      <!-- Account Deletion -->
      <div class="settings-card danger-zone">
        <h2>⚠️ Delete Account</h2>
        <p class="card-description">
          Permanently delete your account and all associated data
        </p>

        <div class="warning-box">
          <strong>⚠️ Warning:</strong>
          <p>
            This action cannot be undone. All your data will be permanently deleted,
            including:
          </p>
          <ul>
            <li>Personal information</li>
            <li>Order history</li>
            <li>Reviews and ratings</li>
            <li>Saved preferences</li>
            <li>Digital product access</li>
          </ul>
        </div>

        <div class="deletion-confirmation">
          <label class="checkbox-label">
            <input type="checkbox" v-model="confirmDelete" />
            I understand that this action is permanent and irreversible
          </label>

          <label class="checkbox-label">
            <input type="checkbox" v-model="confirmNoRefund" />
            I understand that I will not be entitled to any refunds
          </label>
        </div>

        <button
          @click="showDeleteModal = true"
          :disabled="!confirmDelete || !confirmNoRefund"
          class="btn btn-danger"
        >
          🗑️ Delete My Account
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <h2>⚠️ Final Confirmation</h2>
        <p>
          Are you absolutely sure you want to delete your account?
        </p>

        <div class="form-group">
          <label>Type "DELETE" to confirm:</label>
          <input
            type="text"
            v-model="deleteConfirmText"
            placeholder="DELETE"
          />
        </div>

        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn btn-secondary">
            Cancel
          </button>
          <button
            @click="deleteAccount"
            :disabled="deleteConfirmText !== 'DELETE'"
            class="btn btn-danger"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import gdprService from '@/services/gdprService';
import { useToast } from 'vue-toastification';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const consentData = ref(null);
const exportRequests = ref([]);
const exportPending = ref(false);

const rectificationForm = ref({
  field: '',
  currentValue: '',
  correctedValue: '',
  reason: '',
});

const confirmDelete = ref(false);
const confirmNoRefund = ref(false);
const showDeleteModal = ref(false);
const deleteConfirmText = ref('');

const formatConsentKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
};

const getConsentDescription = (key) => {
  const descriptions = {
    marketing: 'Receive promotional emails and offers',
    analytics: 'Help us improve by sharing usage data',
    personalization: 'Personalize your shopping experience',
    thirdParty: 'Share data with trusted partners',
  };
  return descriptions[key] || 'Data processing consent';
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

const loadConsent = async () => {
  try {
    const data = await gdprService.getConsent();
    consentData.value = data;
  } catch (error) {
    console.error('Error loading consent:', error);
  }
};

const updateConsent = (key, value) => {
  consentData.value[key] = value;
};

const saveConsent = async () => {
  try {
    await gdprService.updateConsent(consentData.value);
    toast.success('Consent preferences updated successfully');
  } catch (error) {
    console.error('Error saving consent:', error);
    toast.error('Failed to update consent preferences');
  }
};

const requestExport = async () => {
  exportPending.value = true;
  try {
    const data = await gdprService.exportUserData();
    exportRequests.value.unshift(data);
    toast.success('Data export requested. You will be notified when ready.');
  } catch (error) {
    console.error('Error requesting export:', error);
    toast.error('Failed to request data export');
  } finally {
    exportPending.value = false;
  }
};

const downloadExport = async (exportId) => {
  try {
    await gdprService.downloadExport(exportId);
    toast.success('Download started');
  } catch (error) {
    console.error('Error downloading export:', error);
    toast.error('Failed to download export');
  }
};

const submitRectification = async () => {
  try {
    await gdprService.rectifyData(rectificationForm.value);
    toast.success('Data rectification request submitted successfully');
    
    // Reset form
    rectificationForm.value = {
      field: '',
      currentValue: '',
      correctedValue: '',
      reason: '',
    };
  } catch (error) {
    console.error('Error submitting rectification:', error);
    toast.error('Failed to submit rectification request');
  }
};

const deleteAccount = async () => {
  try {
    await gdprService.deleteUserAccount();
    toast.success('Account deleted successfully. Goodbye!');
    
    // Redirect to home after 2 seconds
    setTimeout(() => {
      router.push('/');
    }, 2000);
  } catch (error) {
    console.error('Error deleting account:', error);
    toast.error('Failed to delete account');
  }
};

onMounted(() => {
  loadConsent();
});
</script>

<style scoped>
.gdpr-settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  text-align: center;
  margin-bottom: 3rem;
}

.settings-header h1 {
  margin-bottom: 0.5rem;
}

.settings-header p {
  color: #666;
}

.settings-grid {
  display: grid;
  gap: 2rem;
}

.settings-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-card h2 {
  margin-bottom: 0.5rem;
  color: #333;
}

.card-description {
  color: #666;
  margin-bottom: 1.5rem;
}

.consent-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.consent-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #28a745;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.consent-info {
  flex: 1;
}

.consent-info strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #333;
}

.consent-info p {
  font-size: 0.875rem;
  color: #666;
}

.export-history {
  margin-bottom: 1.5rem;
}

.export-history h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.export-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.export-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.export-date {
  font-size: 0.875rem;
  color: #666;
}

.export-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  display: inline-block;
}

.status-pending {
  background: #ffc107;
  color: #000;
}

.status-processing {
  background: #17a2b8;
  color: white;
}

.status-completed {
  background: #28a745;
  color: white;
}

.rectification-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.danger-zone {
  border: 2px solid #dc3545;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.warning-box strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #856404;
}

.warning-box ul {
  margin: 0.5rem 0 0 1.5rem;
  color: #856404;
}

.deletion-confirmation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 1rem;
  font-style: italic;
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
  max-width: 500px;
  width: 90%;
}

.modal h2 {
  margin-bottom: 1rem;
  color: #dc3545;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}
</style>
