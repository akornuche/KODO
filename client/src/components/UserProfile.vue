<template>
  <div class="user-profile">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>

    <div v-else-if="profile" class="profile-container">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-avatar">
          <img 
            :src="profile.user.profilePicture || '/default-avatar.png'" 
            :alt="profile.user.username"
            class="avatar-image"
          />
          <span :class="['role-badge', `role-${profile.user.role}`]">
            {{ profile.user.role }}
          </span>
        </div>

        <div class="profile-info">
          <h1 class="profile-name">
            {{ profile.user.firstName }} {{ profile.user.lastName }}
            <span class="username">@{{ profile.user.username }}</span>
          </h1>

          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ profile.user.stats.products }}</span>
              <span class="stat-label">Products</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.profile.followers }}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.profile.following }}</span>
              <span class="stat-label">Following</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.user.stats.reviews }}</span>
              <span class="stat-label">Reviews</span>
            </div>
          </div>

          <div class="profile-actions">
            <button 
              v-if="!profile.profile.isOwnProfile"
              @click="toggleFollow"
              :class="['btn-follow', { following: profile.profile.isFollowing }]"
              :disabled="followLoading"
            >
              {{ profile.profile.isFollowing ? 'Unfollow' : 'Follow' }}
            </button>
            <button 
              v-if="profile.profile.isOwnProfile"
              @click="showEditModal = true"
              class="btn-edit"
            >
              Edit Profile
            </button>
            <button 
              v-if="!profile.profile.isOwnProfile"
              @click="sendMessage"
              class="btn-message"
            >
              Message
            </button>
          </div>
        </div>
      </div>

      <!-- Profile Details -->
      <div class="profile-content">
        <div class="profile-sidebar">
          <div class="info-section">
            <h3>About</h3>
            <p v-if="profile.profile.bio" class="bio">{{ profile.profile.bio }}</p>
            <p v-else class="bio-empty">No bio yet</p>

            <div v-if="profile.profile.location" class="info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{{ profile.profile.location }}</span>
            </div>

            <div v-if="profile.profile.website" class="info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <a :href="profile.profile.website" target="_blank" rel="noopener">
                {{ formatWebsite(profile.profile.website) }}
              </a>
            </div>

            <div v-if="profile.user.createdAt" class="info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Joined {{ formatDate(profile.user.createdAt) }}</span>
            </div>
          </div>

          <div v-if="profile.profile.socialLinks && Object.keys(profile.profile.socialLinks).length > 0" class="social-links">
            <h3>Social Links</h3>
            <a 
              v-for="(url, platform) in profile.profile.socialLinks" 
              :key="platform"
              :href="url"
              target="_blank"
              rel="noopener"
              :class="['social-link', `social-${platform}`]"
            >
              {{ platform }}
            </a>
          </div>
        </div>

        <div class="profile-main">
          <!-- Activity Tabs -->
          <div class="activity-tabs">
            <button 
              @click="activeTab = 'products'"
              :class="['tab-btn', { active: activeTab === 'products' }]"
            >
              Products ({{ profile.user.stats.products }})
            </button>
            <button 
              @click="activeTab = 'reviews'"
              :class="['tab-btn', { active: activeTab === 'reviews' }]"
            >
              Reviews ({{ profile.user.stats.reviews }})
            </button>
            <button 
              @click="activeTab = 'followers'"
              :class="['tab-btn', { active: activeTab === 'followers' }]"
            >
              Followers ({{ profile.profile.followers }})
            </button>
            <button 
              @click="activeTab = 'following'"
              :class="['tab-btn', { active: activeTab === 'following' }]"
            >
              Following ({{ profile.profile.following }})
            </button>
          </div>

          <!-- Products Tab -->
          <div v-if="activeTab === 'products'" class="tab-content">
            <div v-if="profile.activity.recentProducts.length > 0" class="products-grid">
              <div 
                v-for="product in profile.activity.recentProducts" 
                :key="product.id"
                class="product-card"
                @click="viewProduct(product.id)"
              >
                <img 
                  :src="product.images?.[0] || '/placeholder.png'" 
                  :alt="product.title"
                  class="product-image"
                />
                <div class="product-info">
                  <h4>{{ product.title }}</h4>
                  <p class="product-price">${{ product.price.toFixed(2) }}</p>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No products yet</p>
            </div>
          </div>

          <!-- Reviews Tab -->
          <div v-if="activeTab === 'reviews'" class="tab-content">
            <div v-if="profile.activity.recentReviews.length > 0" class="reviews-list">
              <div 
                v-for="review in profile.activity.recentReviews" 
                :key="review.id"
                class="review-item"
              >
                <div class="review-header">
                  <div class="review-rating">
                    <span v-for="star in 5" :key="star" :class="['star', { filled: star <= review.rating }]">
                      ★
                    </span>
                  </div>
                  <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                </div>
                <p class="review-text">{{ review.comment }}</p>
                <p class="review-product">On: {{ review.product.title }}</p>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No reviews yet</p>
            </div>
          </div>

          <!-- Followers Tab -->
          <div v-if="activeTab === 'followers'" class="tab-content">
            <div v-if="followersList.length > 0" class="users-list">
              <div 
                v-for="user in followersList" 
                :key="user.id"
                class="user-item"
                @click="viewProfile(user.id)"
              >
                <img :src="user.profilePicture || '/default-avatar.png'" :alt="user.username" class="user-avatar" />
                <div class="user-info">
                  <h4>{{ user.firstName }} {{ user.lastName }}</h4>
                  <p>@{{ user.username }}</p>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>No followers yet</p>
            </div>
          </div>

          <!-- Following Tab -->
          <div v-if="activeTab === 'following'" class="tab-content">
            <div v-if="followingList.length > 0" class="users-list">
              <div 
                v-for="user in followingList" 
                :key="user.id"
                class="user-item"
                @click="viewProfile(user.id)"
              >
                <img :src="user.profilePicture || '/default-avatar.png'" :alt="user.username" class="user-avatar" />
                <div class="user-info">
                  <h4>{{ user.firstName }} {{ user.lastName }}</h4>
                  <p>@{{ user.username }}</p>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>Not following anyone yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Edit Profile</h2>
          <button @click="showEditModal = false" class="modal-close">×</button>
        </div>
        <form @submit.prevent="saveProfile" class="edit-form">
          <div class="form-group">
            <label>Bio</label>
            <textarea 
              v-model="editForm.bio"
              maxlength="500"
              rows="4"
              placeholder="Tell us about yourself..."
            ></textarea>
            <span class="char-count">{{ editForm.bio?.length || 0 }}/500</span>
          </div>

          <div class="form-group">
            <label>Location</label>
            <input 
              v-model="editForm.location"
              type="text"
              maxlength="100"
              placeholder="City, Country"
            />
          </div>

          <div class="form-group">
            <label>Website</label>
            <input 
              v-model="editForm.website"
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="showEditModal = false" class="btn-cancel">
              Cancel
            </button>
            <button type="submit" class="btn-save" :disabled="saveLoading">
              {{ saveLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';

export default {
  name: 'UserProfile',
  
  setup() {
    const route = useRoute();
    const router = useRouter();
    
    const loading = ref(true);
    const followLoading = ref(false);
    const saveLoading = ref(false);
    const profile = ref(null);
    const activeTab = ref('products');
    const showEditModal = ref(false);
    const followersList = ref([]);
    const followingList = ref([]);
    
    const editForm = ref({
      bio: '',
      location: '',
      website: '',
    });

    const userId = computed(() => route.params.userId || localStorage.getItem('userId'));

    const fetchProfile = async () => {
      loading.value = true;
      try {
        const response = await api.get(`/social/profile/${userId.value}`);
        profile.value = response.data;
        
        // Initialize edit form with current data
        if (profile.value.profile.isOwnProfile) {
          editForm.value = {
            bio: profile.value.profile.bio || '',
            location: profile.value.profile.location || '',
            website: profile.value.profile.website || '',
          };
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        loading.value = false;
      }
    };

    const fetchFollowers = async () => {
      try {
        const response = await api.get(`/social/followers/${userId.value}`);
        followersList.value = response.data.followers || [];
      } catch (error) {
        console.error('Failed to fetch followers:', error);
      }
    };

    const fetchFollowing = async () => {
      try {
        const response = await api.get(`/social/following/${userId.value}`);
        followingList.value = response.data.following || [];
      } catch (error) {
        console.error('Failed to fetch following:', error);
      }
    };

    const toggleFollow = async () => {
      followLoading.value = true;
      try {
        if (profile.value.profile.isFollowing) {
          await api.delete(`/social/follow/${userId.value}`);
          profile.value.profile.isFollowing = false;
          profile.value.profile.followers--;
        } else {
          await api.post(`/social/follow/${userId.value}`);
          profile.value.profile.isFollowing = true;
          profile.value.profile.followers++;
        }
      } catch (error) {
        console.error('Failed to toggle follow:', error);
      } finally {
        followLoading.value = false;
      }
    };

    const saveProfile = async () => {
      saveLoading.value = true;
      try {
        await api.put('/social/profile', editForm.value);
        
        // Update local profile data
        profile.value.profile.bio = editForm.value.bio;
        profile.value.profile.location = editForm.value.location;
        profile.value.profile.website = editForm.value.website;
        
        showEditModal.value = false;
      } catch (error) {
        console.error('Failed to save profile:', error);
        alert('Failed to save profile. Please try again.');
      } finally {
        saveLoading.value = false;
      }
    };

    const sendMessage = () => {
      router.push(`/chat/${userId.value}`);
    };

    const viewProduct = (productId) => {
      router.push(`/products/${productId}`);
    };

    const viewProfile = (userId) => {
      router.push(`/profile/${userId}`);
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const formatWebsite = (url) => {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    };

    // Watch for tab changes to load data
    watch(activeTab, (newTab) => {
      if (newTab === 'followers' && followersList.value.length === 0) {
        fetchFollowers();
      } else if (newTab === 'following' && followingList.value.length === 0) {
        fetchFollowing();
      }
    });

    // Watch for route changes
    watch(() => route.params.userId, () => {
      if (route.params.userId) {
        fetchProfile();
      }
    });

    onMounted(() => {
      fetchProfile();
    });

    return {
      loading,
      followLoading,
      saveLoading,
      profile,
      activeTab,
      showEditModal,
      followersList,
      followingList,
      editForm,
      toggleFollow,
      saveProfile,
      sendMessage,
      viewProduct,
      viewProfile,
      formatDate,
      formatWebsite,
    };
  },
};
</script>

<style scoped>
.user-profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
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

.profile-header {
  display: flex;
  gap: 30px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.profile-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #f8f9fa;
}

.role-badge {
  position: absolute;
  bottom: 10px;
  right: 0;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: #007bff;
  color: white;
}

.role-seller {
  background: #28a745;
}

.role-courier {
  background: #ffc107;
  color: #000;
}

.role-admin {
  background: #dc3545;
}

.profile-info {
  flex: 1;
}

.profile-name {
  margin: 0 0 10px 0;
  font-size: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-size: 18px;
  color: #6c757d;
  font-weight: 400;
}

.profile-stats {
  display: flex;
  gap: 30px;
  margin: 20px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #007bff;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
}

.profile-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-follow,
.btn-edit,
.btn-message {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-follow {
  background: #007bff;
  color: white;
}

.btn-follow.following {
  background: #6c757d;
}

.btn-follow:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-edit {
  background: #28a745;
  color: white;
}

.btn-message {
  background: white;
  color: #007bff;
  border: 2px solid #007bff;
}

.profile-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.profile-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section,
.social-links {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-section h3,
.social-links h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
}

.bio {
  margin: 0 0 15px 0;
  line-height: 1.6;
  color: #495057;
}

.bio-empty {
  color: #6c757d;
  font-style: italic;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #6c757d;
  font-size: 14px;
}

.info-item svg {
  flex-shrink: 0;
}

.info-item a {
  color: #007bff;
  text-decoration: none;
}

.info-item a:hover {
  text-decoration: underline;
}

.social-link {
  display: inline-block;
  margin-right: 10px;
  margin-bottom: 10px;
  padding: 6px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  text-decoration: none;
  color: #495057;
  text-transform: capitalize;
  transition: all 0.3s;
}

.social-link:hover {
  background: #007bff;
  color: white;
}

.profile-main {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.activity-tabs {
  display: flex;
  border-bottom: 2px solid #e9ecef;
}

.tab-btn {
  flex: 1;
  padding: 15px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 16px;
  font-weight: 600;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-content {
  padding: 20px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.product-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.product-info {
  padding: 15px;
}

.product-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.product-price {
  margin: 0;
  font-size: 20px;
  color: #007bff;
  font-weight: 700;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.review-rating {
  color: #ffc107;
  font-size: 18px;
}

.star {
  color: #ddd;
}

.star.filled {
  color: #ffc107;
}

.review-date {
  font-size: 12px;
  color: #6c757d;
}

.review-text {
  margin: 0 0 10px 0;
  line-height: 1.6;
}

.review-product {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.user-item:hover {
  background: #e9ecef;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.user-info p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6c757d;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 32px;
  color: #6c757d;
  cursor: pointer;
  line-height: 1;
}

.edit-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancel,
.btn-save {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-save {
  background: #007bff;
  color: white;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-content {
    grid-template-columns: 1fr;
  }

  .activity-tabs {
    overflow-x: auto;
  }

  .tab-btn {
    white-space: nowrap;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
