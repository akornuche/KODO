<template>
  <div class="digital-library">
    <div class="library-header">
      <h1>📦 My Digital Products</h1>
      <p>Access and download your purchased digital products</p>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading your digital products...</p>
    </div>

    <div v-else-if="products.length" class="library-content">
      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ products.length }}</div>
          <div class="stat-label">Total Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalDownloads }}</div>
          <div class="stat-label">Total Downloads</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ availableDownloads }}</div>
          <div class="stat-label">Available Downloads</div>
        </div>
      </div>

      <!-- Products Grid -->
      <div class="products-grid">
        <div
          v-for="product in products"
          :key="product.id"
          class="product-card"
        >
          <div class="product-image">
            <img
              :src="product.product?.images?.[0] || '/placeholder.png'"
              :alt="product.product?.name"
            />
            <div class="product-badge">Digital</div>
          </div>

          <div class="product-info">
            <h3>{{ product.product?.name }}</h3>
            <p class="product-description">
              {{ product.product?.description?.slice(0, 100) }}...
            </p>

            <div class="product-meta">
              <div class="meta-item">
                <strong>File Type:</strong>
                <span>{{ product.fileType?.toUpperCase() }}</span>
              </div>
              <div class="meta-item">
                <strong>File Size:</strong>
                <span>{{ formatFileSize(product.fileSize) }}</span>
              </div>
              <div class="meta-item">
                <strong>Purchased:</strong>
                <span>{{ formatDate(product.purchaseDate) }}</span>
              </div>
            </div>

            <div class="download-info">
              <div class="download-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: downloadProgress(product) + '%' }"
                  ></div>
                </div>
                <span class="download-count">
                  {{ product.downloadCount || 0 }} / {{ product.maxDownloads || 'Unlimited' }} downloads
                </span>
              </div>

              <button
                @click="downloadProduct(product)"
                :disabled="!canDownload(product) || downloading[product.id]"
                class="btn btn-primary"
              >
                <span v-if="downloading[product.id]">
                  <span class="spinner-small"></span>
                  Downloading...
                </span>
                <span v-else-if="!canDownload(product)">
                  Download Limit Reached
                </span>
                <span v-else>
                  ⬇️ Download
                </span>
              </button>
            </div>

            <!-- Download History -->
            <div v-if="product.downloads?.length" class="download-history">
              <details>
                <summary>Download History ({{ product.downloads.length }})</summary>
                <ul class="history-list">
                  <li
                    v-for="download in product.downloads"
                    :key="download.id"
                  >
                    <span>{{ formatDateTime(download.downloadedAt) }}</span>
                    <span class="ip">{{ download.ipAddress }}</span>
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📦</div>
      <h2>No Digital Products Yet</h2>
      <p>Browse our store to purchase digital products</p>
      <router-link to="/shop?category=digital" class="btn btn-primary">
        Browse Digital Products
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import digitalProductService from '@/services/digitalProductService';
import { useToast } from 'vue-toastification';

const toast = useToast();

const products = ref([]);
const loading = ref(true);
const downloading = ref({});

const totalDownloads = computed(() => {
  return products.value.reduce((sum, p) => sum + (p.downloadCount || 0), 0);
});

const availableDownloads = computed(() => {
  return products.value.reduce((sum, p) => {
    if (!p.maxDownloads) return sum + 999; // Unlimited
    return sum + Math.max(0, p.maxDownloads - (p.downloadCount || 0));
  }, 0);
});

const canDownload = (product) => {
  if (!product.maxDownloads) return true; // Unlimited
  return (product.downloadCount || 0) < product.maxDownloads;
};

const downloadProgress = (product) => {
  if (!product.maxDownloads) return 0; // Unlimited shows no progress
  return ((product.downloadCount || 0) / product.maxDownloads) * 100;
};

const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

const loadProducts = async () => {
  loading.value = true;
  try {
    const data = await digitalProductService.getMyDigitalProducts();
    products.value = data;
  } catch (error) {
    console.error('Error loading digital products:', error);
    toast.error('Failed to load your digital library');
  } finally {
    loading.value = false;
  }
};

const downloadProduct = async (product) => {
  if (!canDownload(product)) {
    toast.error('Download limit reached for this product');
    return;
  }

  downloading.value[product.id] = true;

  try {
    // Generate download token
    const { token } = await digitalProductService.generateDownloadToken(
      product.id
    );

    // Download the file
    await digitalProductService.downloadDigitalProduct(product.id, token);

    // Update download count locally
    product.downloadCount = (product.downloadCount || 0) + 1;

    toast.success('Download started successfully!');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download product. Please try again.');
  } finally {
    downloading.value[product.id] = false;
  }
};

onMounted(() => {
  loadProducts();
});
</script>

<style scoped>
.digital-library {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.library-header {
  text-align: center;
  margin-bottom: 2rem;
}

.library-header h1 {
  margin-bottom: 0.5rem;
}

.library-header p {
  color: #666;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.product-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-info {
  padding: 1.5rem;
}

.product-info h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.product-description {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.product-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  justify-content: space-between;
}

.download-info {
  margin-top: 1rem;
}

.download-progress {
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.download-count {
  font-size: 0.875rem;
  color: #666;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.download-history {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

details summary {
  cursor: pointer;
  font-size: 0.875rem;
  color: #007bff;
  padding: 0.5rem 0;
  user-select: none;
}

details summary:hover {
  color: #0056b3;
}

.history-list {
  list-style: none;
  padding: 0.5rem 0 0;
  margin: 0;
}

.history-list li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.ip {
  color: #999;
  font-family: monospace;
}

.empty-state {
  background: white;
  border-radius: 12px;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #666;
  margin-bottom: 2rem;
}
</style>
