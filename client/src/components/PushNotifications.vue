<template>
  <div class="push-notifications">
    <div class="notification-header">
      <h3>Push Notifications</h3>
      <p>Receive instant notifications on your device</p>
    </div>

    <!-- Browser Push Notifications -->
    <div class="notification-section">
      <div class="section-header">
        <h4>Browser Notifications</h4>
        <div class="toggle-container">
          <label class="toggle">
            <input
              type="checkbox"
              v-model="browserEnabled"
              @change="toggleBrowserNotifications"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div v-if="browserEnabled" class="notification-status">
        <div v-if="subscriptionStatus === 'subscribed'" class="status-success">
          <i class="fas fa-check-circle"></i>
          <span>Browser notifications enabled</span>
        </div>
        <div v-else-if="subscriptionStatus === 'denied'" class="status-error">
          <i class="fas fa-times-circle"></i>
          <span>Browser notifications blocked. Please enable in browser settings.</span>
        </div>
        <div v-else-if="subscriptionStatus === 'default'" class="status-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Click "Enable" to receive browser notifications</span>
        </div>
        <button
          v-if="subscriptionStatus === 'default'"
          @click="enableBrowserNotifications"
          class="btn btn-primary btn-sm"
          :disabled="loading"
        >
          <i class="fas fa-bell"></i>
          Enable Browser Notifications
        </button>
      </div>
    </div>

    <!-- Mobile Push Notifications -->
    <div class="notification-section">
      <div class="section-header">
        <h4>Mobile App Notifications</h4>
        <div class="status-indicator">
          <span v-if="isMobileApp" class="status-success">
            <i class="fas fa-mobile-alt"></i>
            Connected to mobile app
          </span>
          <span v-else class="status-info">
            <i class="fas fa-info-circle"></i>
            Download our mobile app for push notifications
          </span>
        </div>
      </div>
    </div>

    <!-- Notification Preferences -->
    <div class="notification-section">
      <h4>Notification Types</h4>
      <div class="preferences-grid">
        <div class="preference-item">
          <div class="preference-info">
            <h5>Order Updates</h5>
            <p>Get notified about order status changes</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="preferences.push.orderUpdates"
              @change="updatePreferences"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="preference-item">
          <div class="preference-info">
            <h5>Delivery Updates</h5>
            <p>Track your packages in real-time</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="preferences.push.deliveryUpdates"
              @change="updatePreferences"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="preference-item">
          <div class="preference-info">
            <h5>Bid Notifications</h5>
            <p>Receive notifications about new bids and offers</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              v-model="preferences.push.bidNotifications"
              @change="updatePreferences"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Test Notifications -->
    <div class="notification-section">
      <h4>Test Notifications</h4>
      <p>Send a test notification to verify your setup</p>
      <button
        @click="sendTestNotification"
        class="btn btn-secondary"
        :disabled="loading"
      >
        <i class="fas fa-paper-plane"></i>
        Send Test Notification
      </button>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script>
import api from '../services/api';

export default {
  name: 'PushNotifications',
  data() {
    return {
      browserEnabled: false,
      subscriptionStatus: 'default', // 'default', 'subscribed', 'denied'
      isMobileApp: false,
      loading: false,
      preferences: {
        push: {
          orderUpdates: true,
          deliveryUpdates: true,
          bidNotifications: true,
        },
      },
    };
  },
  async mounted() {
    await this.checkNotificationSupport();
    await this.loadPreferences();
    this.checkMobileApp();
  },
  methods: {
    async checkNotificationSupport() {
      if ('Notification' in window) {
        this.subscriptionStatus = Notification.permission;
        this.browserEnabled = Notification.permission === 'granted';
      } else {
        this.browserEnabled = false;
        this.subscriptionStatus = 'unsupported';
      }
    },

    async enableBrowserNotifications() {
      try {
        this.loading = true;

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          this.$toast.error('Push notifications are not supported in this browser');
          return;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          await this.registerServiceWorker();
          this.subscriptionStatus = 'subscribed';
          this.browserEnabled = true;
          this.$toast.success('Browser notifications enabled!');
        } else {
          this.subscriptionStatus = 'denied';
          this.browserEnabled = false;
          this.$toast.warning('Browser notifications permission denied');
        }
      } catch (error) {
        console.error('Error enabling browser notifications:', error);
        this.$toast.error('Failed to enable browser notifications');
      } finally {
        this.loading = false;
      }
    },

    async registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(process.env.VUE_APP_VAPID_PUBLIC_KEY),
        });

        // Register subscription with backend
        await api.post('/notifications/push-subscription', {
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: this.arrayBufferToBase64(subscription.getKey('auth')),
            },
          },
        });

        console.log('Push subscription registered:', subscription.endpoint);
      } catch (error) {
        console.error('Error registering service worker:', error);
        throw error;
      }
    },

    toggleBrowserNotifications() {
      if (this.browserEnabled) {
        this.enableBrowserNotifications();
      } else {
        // Unsubscribe from push notifications
        this.unsubscribeBrowserNotifications();
      }
    },

    async unsubscribeBrowserNotifications() {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
        this.subscriptionStatus = 'default';
        this.browserEnabled = false;
        this.$toast.info('Browser notifications disabled');
      } catch (error) {
        console.error('Error unsubscribing:', error);
        this.$toast.error('Failed to disable browser notifications');
      }
    },

    checkMobileApp() {
      // Check if running in mobile app (could be detected via user agent or app-specific logic)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      this.isMobileApp = isMobile && window.ReactNativeWebView; // Example check for React Native WebView
    },

    async loadPreferences() {
      try {
        const response = await api.get('/notifications/preferences');
        this.preferences = response.data.preferences;
      } catch (error) {
        console.error('Error loading preferences:', error);
        this.$toast.error('Failed to load notification preferences');
      }
    },

    async updatePreferences() {
      try {
        this.loading = true;
        await api.put('/notifications/preferences', this.preferences);
        this.$toast.success('Notification preferences updated');
      } catch (error) {
        console.error('Error updating preferences:', error);
        this.$toast.error('Failed to update notification preferences');
      } finally {
        this.loading = false;
      }
    },

    async sendTestNotification() {
      try {
        this.loading = true;
        await api.post('/notifications/test');
        this.$toast.success('Test notification sent!');
      } catch (error) {
        console.error('Error sending test notification:', error);
        this.$toast.error('Failed to send test notification');
      } finally {
        this.loading = false;
      }
    },

    urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodePointAt(i);
      }
      return outputArray;
    },

    arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },
  },
};
</script>

<style scoped>
.push-notifications {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.notification-header {
  text-align: center;
  margin-bottom: 30px;
}

.notification-header h3 {
  color: #333;
  margin-bottom: 8px;
}

.notification-header p {
  color: #666;
  margin: 0;
}

.notification-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
  color: #333;
}

.toggle-container {
  display: flex;
  align-items: center;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: #10b981;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.notification-status {
  padding: 15px;
  border-radius: 6px;
  margin-top: 10px;
}

.status-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.status-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.status-success,
.status-error,
.status-warning,
.status-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.status-indicator {
  font-size: 14px;
}

.preferences-grid {
  display: grid;
  gap: 15px;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.preference-info h5 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.preference-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .push-notifications {
    padding: 15px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .preference-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>