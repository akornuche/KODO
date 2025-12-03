<template>
  <div class="bulk-upload">
    <div class="upload-header">
      <h1>📦 Bulk Product Upload</h1>
      <p>Upload multiple products at once using CSV</p>
    </div>

    <!-- Upload Section -->
    <div class="upload-section">
      <h2>Upload CSV File</h2>

      <div class="upload-instructions">
        <h3>📋 Instructions:</h3>
        <ol>
          <li>Download the CSV template</li>
          <li>Fill in your product information</li>
          <li>Upload the completed CSV file</li>
          <li>Review and confirm the import</li>
        </ol>

        <button @click="downloadTemplate" class="btn btn-secondary">
          ⬇️ Download CSV Template
        </button>
      </div>

      <div class="upload-zone" :class="{ dragging: isDragging }">
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          style="display: none"
        />

        <div
          class="drop-area"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          @click="$refs.fileInput.click()"
        >
          <div v-if="!selectedFile" class="drop-content">
            <div class="upload-icon">📁</div>
            <h3>Drop CSV file here or click to browse</h3>
            <p>Maximum file size: 10MB</p>
          </div>

          <div v-else class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <h3>{{ selectedFile.name }}</h3>
              <p>{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button @click.stop="removeFile" class="btn-remove">❌</button>
          </div>
        </div>

        <button
          v-if="selectedFile"
          @click="uploadFile"
          :disabled="uploading"
          class="btn btn-primary"
        >
          <span v-if="uploading">
            <span class="spinner-small"></span>
            Uploading...
          </span>
          <span v-else>
            🚀 Upload and Process
          </span>
        </button>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploadResult" class="upload-result">
        <div class="result-header" :class="uploadResult.hasErrors ? 'error' : 'success'">
          <h3>
            <span v-if="uploadResult.hasErrors">⚠️</span>
            <span v-else>✅</span>
            Upload {{ uploadResult.hasErrors ? 'Completed with Errors' : 'Successful' }}
          </h3>
        </div>

        <div class="result-stats">
          <div class="stat">
            <div class="stat-value">{{ uploadResult.totalRows }}</div>
            <div class="stat-label">Total Rows</div>
          </div>
          <div class="stat">
            <div class="stat-value success">{{ uploadResult.successCount }}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat">
            <div class="stat-value error">{{ uploadResult.errorCount }}</div>
            <div class="stat-label">Errors</div>
          </div>
        </div>

        <div v-if="uploadResult.errors && uploadResult.errors.length" class="errors-list">
          <h4>Errors:</h4>
          <ul>
            <li v-for="(error, index) in uploadResult.errors" :key="index">
              <strong>Row {{ error.row }}:</strong> {{ error.message }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Upload History -->
    <div class="history-section">
      <h2>Upload History</h2>

      <div v-if="uploadHistory.length" class="history-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Filename</th>
              <th>Total Rows</th>
              <th>Success</th>
              <th>Errors</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="upload in uploadHistory" :key="upload.id">
              <td>{{ formatDateTime(upload.createdAt) }}</td>
              <td>{{ upload.filename }}</td>
              <td>{{ upload.totalRows }}</td>
              <td class="success-count">{{ upload.successCount }}</td>
              <td class="error-count">{{ upload.errorCount }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(upload.status)">
                  {{ upload.status }}
                </span>
              </td>
              <td>
                <button
                  v-if="upload.errorReport"
                  @click="downloadErrorReport(upload.id)"
                  class="btn btn-sm"
                >
                  📄 Error Report
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <p>No upload history yet</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { enhancedFeaturesService } from '@/services/enhancedFeaturesService';
import { useToast } from 'vue-toastification';

const toast = useToast();

const selectedFile = ref(null);
const isDragging = ref(false);
const uploading = ref(false);
const uploadResult = ref(null);
const uploadHistory = ref([]);
const fileInput = ref(null);

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

const getStatusClass = (status) => {
  if (status === 'completed') return 'status-success';
  if (status === 'processing') return 'status-processing';
  if (status === 'failed') return 'status-error';
  return '';
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const handleFileDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const validateAndSetFile = (file) => {
  if (!file.name.endsWith('.csv')) {
    toast.error('Please select a CSV file');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size must be less than 10MB');
    return;
  }

  selectedFile.value = file;
  uploadResult.value = null;
};

const removeFile = () => {
  selectedFile.value = null;
  uploadResult.value = null;
};

const downloadTemplate = async () => {
  try {
    await enhancedFeaturesService.bulkUploadService.downloadTemplate();
    toast.success('Template downloaded successfully');
  } catch (error) {
    console.error('Error downloading template:', error);
    toast.error('Failed to download template');
  }
};

const uploadFile = async () => {
  if (!selectedFile.value) return;

  uploading.value = true;

  try {
    const result = await enhancedFeaturesService.bulkUploadService.upload(
      selectedFile.value
    );

    uploadResult.value = {
      totalRows: result.totalRows,
      successCount: result.successCount,
      errorCount: result.errorCount,
      hasErrors: result.errorCount > 0,
      errors: result.errors,
    };

    if (result.errorCount === 0) {
      toast.success(`Successfully uploaded ${result.successCount} products!`);
    } else {
      toast.warning(
        `Upload completed with ${result.errorCount} errors. Check details below.`
      );
    }

    loadHistory();
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Upload failed. Please try again.');
  } finally {
    uploading.value = false;
  }
};

const loadHistory = async () => {
  try {
    const data = await enhancedFeaturesService.bulkUploadService.getHistory();
    uploadHistory.value = data;
  } catch (error) {
    console.error('Error loading history:', error);
  }
};

const downloadErrorReport = async (uploadId) => {
  try {
    await enhancedFeaturesService.bulkUploadService.downloadErrorReport(uploadId);
    toast.success('Error report downloaded');
  } catch (error) {
    console.error('Error downloading report:', error);
    toast.error('Failed to download error report');
  }
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.bulk-upload {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.upload-header {
  text-align: center;
  margin-bottom: 3rem;
}

.upload-section,
.history-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.upload-instructions {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.upload-instructions h3 {
  margin-bottom: 1rem;
}

.upload-instructions ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.upload-zone {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drop-area {
  border: 3px dashed #ddd;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.drop-area:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.dragging .drop-area {
  border-color: #28a745;
  background: #d4edda;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.drop-content h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.drop-content p {
  color: #666;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.file-icon {
  font-size: 3rem;
}

.file-details h3 {
  margin-bottom: 0.25rem;
}

.file-details p {
  color: #666;
  font-size: 0.875rem;
}

.btn-remove {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
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
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
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

.upload-result {
  margin-top: 2rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-header {
  padding: 1.5rem;
  color: white;
}

.result-header.success {
  background: #28a745;
}

.result-header.error {
  background: #ffc107;
  color: #000;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-value.success {
  color: #28a745;
}

.stat-value.error {
  color: #dc3545;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.errors-list {
  padding: 1.5rem;
  background: white;
}

.errors-list h4 {
  margin-bottom: 1rem;
  color: #dc3545;
}

.errors-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.errors-list li {
  padding: 0.75rem;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.history-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

th {
  font-weight: 600;
  color: #333;
}

.success-count {
  color: #28a745;
  font-weight: 600;
}

.error-count {
  color: #dc3545;
  font-weight: 600;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}

.status-success {
  background: #28a745;
  color: white;
}

.status-processing {
  background: #17a2b8;
  color: white;
}

.status-error {
  background: #dc3545;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}
</style>
