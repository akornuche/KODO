<template>
  <div class="activity-feed">
    <div class="feed-header">
      <h2>Activity Feed</h2>
      <p class="feed-description">See what people you follow are up to</p>
    </div>

    <div v-if="loading && feed.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading activity...</p>
    </div>

    <div v-else-if="feed.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <h3>Your feed is empty</h3>
      <p>Follow users to see their activity here</p>
      <button @click="$router.push('/explore')" class="btn-explore">
        Explore Users
      </button>
    </div>

    <div v-else class="feed-list">
      <div 
        v-for="item in feed" 
        :key="`${item.type}-${item.id}`"
        class="feed-item"
      >
        <!-- Product Activity -->
        <div v-if="item.type === 'product'" class="activity-product">
          <div class="activity-header">
            <img 
              :src="item.user.profilePicture || '/default-avatar.png'" 
              :alt="item.user.username"
              class="user-avatar"
              @click="viewProfile(item.user.id)"
            />
            <div class="activity-meta">
              <p class="activity-user">
                <strong @click="viewProfile(item.user.id)">
                  {{ item.user.firstName }} {{ item.user.lastName }}
                </strong>
                listed a new product
              </p>
              <p class="activity-time">{{ formatTime(item.createdAt) }}</p>
            </div>
          </div>

          <div class="product-content" @click="viewProduct(item.id)">
            <img 
              v-if="item.images && item.images[0]"
              :src="item.images[0]" 
              :alt="item.title"
              class="product-image"
            />
            <div class="product-details">
              <h3>{{ item.title }}</h3>
              <p class="product-description">{{ truncate(item.description, 150) }}</p>
              <div class="product-footer">
                <span class="product-price">${{ item.price.toFixed(2) }}</span>
                <span :class="['product-condition', `condition-${item.condition.toLowerCase()}`]">
                  {{ item.condition }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Review Activity -->
        <div v-else-if="item.type === 'review'" class="activity-review">
          <div class="activity-header">
            <img 
              :src="item.user.profilePicture || '/default-avatar.png'" 
              :alt="item.user.username"
              class="user-avatar"
              @click="viewProfile(item.user.id)"
            />
            <div class="activity-meta">
              <p class="activity-user">
                <strong @click="viewProfile(item.user.id)">
                  {{ item.user.firstName }} {{ item.user.lastName }}
                </strong>
                reviewed a product
              </p>
              <p class="activity-time">{{ formatTime(item.createdAt) }}</p>
            </div>
          </div>

          <div class="review-content">
            <div class="review-rating">
              <span v-for="star in 5" :key="star" :class="['star', { filled: star <= item.rating }]">
                ★
              </span>
            </div>
            <p class="review-comment">{{ item.comment }}</p>
            <div class="review-product" @click="viewProduct(item.productId)">
              <span class="review-label">On:</span>
              <span class="review-product-title">{{ item.product.title }}</span>
            </div>
          </div>
        </div>

        <!-- Activity Actions -->
        <div class="activity-actions">
          <button @click="toggleLike(item)" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" :fill="item.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ item.likes || 0 }}</span>
          </button>

          <button @click="toggleComments(item)" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ item.comments || 0 }}</span>
          </button>

          <button @click="shareActivity(item)" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>Share</span>
          </button>
        </div>

        <!-- Comments Section (expandable) -->
        <div v-if="item.showComments" class="comments-section">
          <div class="comments-list">
            <p class="no-comments">Comments coming soon...</p>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="load-more">
        <button @click="loadMore" :disabled="loading" class="btn-load-more">
          {{ loading ? 'Loading...' : 'Load More' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';

export default {
  name: 'ActivityFeed',
  
  setup() {
    const router = useRouter();
    
    const loading = ref(false);
    const feed = ref([]);
    const page = ref(1);
    const limit = ref(10);
    const hasMore = ref(true);

    const fetchFeed = async (isLoadMore = false) => {
      loading.value = true;
      try {
        const response = await api.get('/social/feed', {
          params: {
            page: page.value,
            limit: limit.value,
          },
        });

        const newItems = response.data.feed || [];
        
        if (isLoadMore) {
          feed.value = [...feed.value, ...newItems];
        } else {
          feed.value = newItems;
        }

        hasMore.value = newItems.length === limit.value;
        
        // Add local state for likes/comments
        feed.value = feed.value.map(item => ({
          ...item,
          liked: false,
          likes: Math.floor(Math.random() * 50),
          comments: Math.floor(Math.random() * 20),
          showComments: false,
        }));
      } catch (error) {
        console.error('Failed to fetch activity feed:', error);
      } finally {
        loading.value = false;
      }
    };

    const loadMore = () => {
      page.value++;
      fetchFeed(true);
    };

    const toggleLike = (item) => {
      item.liked = !item.liked;
      item.likes += item.liked ? 1 : -1;
    };

    const toggleComments = (item) => {
      item.showComments = !item.showComments;
    };

    const shareActivity = (item) => {
      const url = item.type === 'product' 
        ? `${window.location.origin}/products/${item.id}`
        : `${window.location.origin}/products/${item.productId}`;
      
      if (navigator.share) {
        navigator.share({
          title: item.title || 'Check this out!',
          url: url,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      }
    };

    const viewProfile = (userId) => {
      router.push(`/profile/${userId}`);
    };

    const viewProduct = (productId) => {
      router.push(`/products/${productId}`);
    };

    const formatTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const truncate = (text, length) => {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    };

    onMounted(() => {
      fetchFeed();
    });

    return {
      loading,
      feed,
      hasMore,
      loadMore,
      toggleLike,
      toggleComments,
      shareActivity,
      viewProfile,
      viewProduct,
      formatTime,
      truncate,
    };
  },
};
</script>

<style scoped>
.activity-feed {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

.feed-header {
  margin-bottom: 30px;
}

.feed-header h2 {
  margin: 0 0 5px 0;
  font-size: 28px;
}

.feed-description {
  margin: 0;
  color: #6c757d;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state svg {
  color: #6c757d;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  font-size: 22px;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #6c757d;
}

.btn-explore {
  padding: 12px 30px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-explore:hover {
  opacity: 0.9;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feed-item {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.activity-product,
.activity-review {
  padding: 20px;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.3s;
}

.user-avatar:hover {
  opacity: 0.8;
}

.activity-meta {
  flex: 1;
}

.activity-user {
  margin: 0 0 5px 0;
  font-size: 15px;
}

.activity-user strong {
  cursor: pointer;
  color: #007bff;
  transition: opacity 0.3s;
}

.activity-user strong:hover {
  opacity: 0.8;
}

.activity-time {
  margin: 0;
  font-size: 13px;
  color: #6c757d;
}

.product-content {
  display: flex;
  gap: 15px;
  cursor: pointer;
  transition: background 0.3s;
  padding: 15px;
  margin: -15px -15px 0 -15px;
  border-radius: 8px;
}

.product-content:hover {
  background: #f8f9fa;
}

.product-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.product-details {
  flex: 1;
}

.product-details h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.product-description {
  margin: 0 0 15px 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.6;
}

.product-footer {
  display: flex;
  align-items: center;
  gap: 15px;
}

.product-price {
  font-size: 24px;
  font-weight: 700;
  color: #007bff;
}

.product-condition {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.condition-new {
  background: #d4edda;
  color: #155724;
}

.condition-used {
  background: #fff3cd;
  color: #856404;
}

.condition-refurbished {
  background: #d1ecf1;
  color: #0c5460;
}

.review-content {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.review-rating {
  color: #ffc107;
  font-size: 20px;
  margin-bottom: 10px;
}

.star {
  color: #ddd;
}

.star.filled {
  color: #ffc107;
}

.review-comment {
  margin: 0 0 15px 0;
  line-height: 1.6;
}

.review-product {
  cursor: pointer;
  color: #6c757d;
  font-size: 14px;
  transition: color 0.3s;
}

.review-product:hover {
  color: #007bff;
}

.review-label {
  margin-right: 5px;
}

.review-product-title {
  font-weight: 600;
}

.activity-actions {
  display: flex;
  gap: 20px;
  padding: 15px 20px;
  border-top: 1px solid #e9ecef;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
  padding: 0;
}

.action-btn:hover {
  color: #007bff;
}

.action-btn svg {
  transition: fill 0.3s;
}

.comments-section {
  padding: 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.no-comments {
  text-align: center;
  color: #6c757d;
  font-style: italic;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.btn-load-more {
  padding: 12px 30px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.btn-load-more:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-load-more:hover:not(:disabled) {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .activity-feed {
    padding: 10px;
  }

  .product-content {
    flex-direction: column;
  }

  .product-image {
    width: 100%;
    height: 200px;
  }

  .activity-actions {
    gap: 10px;
  }
}
</style>
