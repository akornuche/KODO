<template>
  <div class="notifications-center">
    <div class="notifications-header">
      <h2>Notifications</h2>
      <div class="header-actions">
        <button 
          @click="markAllAsRead" 
          :disabled="!hasUnread"
          class="btn-secondary"
        >
          Mark All Read
        </button>
        <button @click="showSettings = !showSettings" class="btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m5.2-10.2l-4.2 4.2m0 6l4.2 4.2M1 12h6m6 0h6m-5.2 5.2l-4.2-4.2m0-6l-4.2-4.2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="notification-filters">
      <button 
        v-for="filter in filters" 
        :key="filter.value"
        @click="activeFilter = filter.value"
        :class="['filter-tab', { active: activeFilter === filter.value }]"
      >
        {{ filter.label }}
        <span v-if="filter.count > 0" class="count-badge">{{ filter.count }}</span>
      </button>
    </div>

    <!-- Settings Panel -->
    <transition name="slide-down">
      <div v-if="showSettings" class="settings-panel">
        <h3>Notification Preferences</h3>
        
        <div class="preference-section">
          <h4>Email Notifications</h4>
          <label v-for="pref in emailPreferences" :key="pref.key" class="preference-item">
            <input 
              type="checkbox" 
              v-model="preferences.email[pref.key]"
              @change="updatePreferences"
            />
            <span>{{ pref.label }}</span>
          </label>
        </div>

        <div class="preference-section">
          <h4>Push Notifications</h4>
          <label v-for="pref in pushPreferences" :key="pref.key" class="preference-item">
            <input 
              type="checkbox" 
              v-model="preferences.push[pref.key]"
              @change="updatePreferences"
            />
            <span>{{ pref.label }}</span>
          </label>
        </div>
      </div>
    </transition>

    <!-- Notifications List -->
    <div class="notifications-list">
      <transition-group name="notification-item" tag="div">
        <div 
          v-for="notification in filteredNotifications" 
          :key="notification.id"
          :class="['notification-item', { unread: !notification.read }]"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon" :class="`icon-${notification.type}`">
            <component :is="getNotificationIcon(notification.type)" />
          </div>
          
          <div class="notification-content">
            <h4>{{ notification.title }}</h4>
            <p>{{ notification.message }}</p>
            <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
          </div>

          <button 
            @click.stop="markAsRead(notification.id)"
            v-if="!notification.read"
            class="btn-icon mark-read"
            title="Mark as read"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
      </transition-group>

      <div v-if="filteredNotifications.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>No notifications</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import { io } from 'socket.io-client';

export default {
  name: 'NotificationsCenter',
  
  setup() {
    const notifications = ref([]);
    const activeFilter = ref('all');
    const showSettings = ref(false);
    const socket = ref(null);
    
    const preferences = ref({
      email: {
        orderUpdates: true,
        paymentNotifications: true,
        deliveryUpdates: true,
        bidNotifications: true,
        refundNotifications: true,
        disputeNotifications: true,
        marketingEmails: false,
      },
      push: {
        orderUpdates: true,
        deliveryUpdates: true,
        bidNotifications: true,
      },
    });

    const emailPreferences = [
      { key: 'orderUpdates', label: 'Order Updates' },
      { key: 'paymentNotifications', label: 'Payment Notifications' },
      { key: 'deliveryUpdates', label: 'Delivery Updates' },
      { key: 'bidNotifications', label: 'Bid Notifications' },
      { key: 'refundNotifications', label: 'Refund Notifications' },
      { key: 'disputeNotifications', label: 'Dispute Notifications' },
      { key: 'marketingEmails', label: 'Marketing Emails' },
    ];

    const pushPreferences = [
      { key: 'orderUpdates', label: 'Order Updates' },
      { key: 'deliveryUpdates', label: 'Delivery Updates' },
      { key: 'bidNotifications', label: 'Bid Notifications' },
    ];

    const filters = computed(() => [
      { 
        value: 'all', 
        label: 'All', 
        count: notifications.value.length 
      },
      { 
        value: 'unread', 
        label: 'Unread', 
        count: notifications.value.filter(n => !n.read).length 
      },
      { 
        value: 'order', 
        label: 'Orders', 
        count: notifications.value.filter(n => n.type === 'order').length 
      },
      { 
        value: 'payment', 
        label: 'Payments', 
        count: notifications.value.filter(n => n.type === 'payment').length 
      },
      { 
        value: 'delivery', 
        label: 'Delivery', 
        count: notifications.value.filter(n => n.type === 'delivery').length 
      },
    ]);

    const filteredNotifications = computed(() => {
      if (activeFilter.value === 'all') {
        return notifications.value;
      } else if (activeFilter.value === 'unread') {
        return notifications.value.filter(n => !n.read);
      } else {
        return notifications.value.filter(n => n.type === activeFilter.value);
      }
    });

    const hasUnread = computed(() => 
      notifications.value.some(n => !n.read)
    );

    const getNotificationIcon = (type) => {
      const icons = {
        order: 'OrderIcon',
        payment: 'PaymentIcon',
        delivery: 'DeliveryIcon',
        bid: 'BidIcon',
        refund: 'RefundIcon',
        dispute: 'DisputeIcon',
        default: 'BellIcon',
      };
      return icons[type] || icons.default;
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString();
    };

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications/unread');
        notifications.value = response.data.notifications || [];
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    const fetchPreferences = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        if (response.data.preferences) {
          preferences.value = response.data.preferences;
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      }
    };

    const updatePreferences = async () => {
      try {
        await api.put('/notifications/preferences', preferences.value);
      } catch (error) {
        console.error('Failed to update preferences:', error);
      }
    };

    const markAsRead = async (notificationId) => {
      try {
        await api.put('/notifications/mark-read', {
          notificationIds: [notificationId],
        });
        
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    };

    const markAllAsRead = async () => {
      try {
        const unreadIds = notifications.value
          .filter(n => !n.read)
          .map(n => n.id);
        
        if (unreadIds.length === 0) return;

        await api.put('/notifications/mark-read', {
          notificationIds: unreadIds,
        });
        
        notifications.value.forEach(n => {
          if (!n.read) n.read = true;
        });
      } catch (error) {
        console.error('Failed to mark all as read:', error);
      }
    };

    const handleNotificationClick = (notification) => {
      markAsRead(notification.id);
      
      // Navigate based on notification type
      if (notification.link) {
        window.location.href = notification.link;
      }
    };

    const setupSocket = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      socket.value = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token },
      });

      socket.value.on('notification', (data) => {
        notifications.value.unshift({
          id: data.id || Date.now().toString(),
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
          read: false,
          createdAt: new Date().toISOString(),
        });

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: '/logo.png',
          });
        }
      });
    };

    onMounted(async () => {
      await fetchNotifications();
      await fetchPreferences();
      setupSocket();

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    return {
      notifications,
      activeFilter,
      showSettings,
      preferences,
      emailPreferences,
      pushPreferences,
      filters,
      filteredNotifications,
      hasUnread,
      getNotificationIcon,
      formatTime,
      markAsRead,
      markAllAsRead,
      handleNotificationClick,
      updatePreferences,
    };
  },
};
</script>

<style scoped>
.notifications-center {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notifications-header h2 {
  margin: 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  padding: 8px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-icon:hover {
  background: #f8f9fa;
  border-color: #999;
}

.notification-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
  overflow-x: auto;
}

.filter-tab {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: #6c757d;
  transition: all 0.3s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: -2px;
}

.filter-tab:hover {
  color: #495057;
}

.filter-tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.count-badge {
  background: #007bff;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  min-width: 20px;
  text-align: center;
}

.filter-tab.active .count-badge {
  background: #0056b3;
}

.settings-panel {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.settings-panel h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
}

.preference-section {
  margin-bottom: 20px;
}

.preference-section:last-child {
  margin-bottom: 0;
}

.preference-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preference-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
}

.preference-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.preference-item span {
  font-size: 14px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.notification-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.notification-item.unread {
  background: #e7f3ff;
  border-color: #007bff;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-order {
  background: #e7f3ff;
  color: #007bff;
}

.icon-payment {
  background: #d4edda;
  color: #28a745;
}

.icon-delivery {
  background: #fff3cd;
  color: #ffc107;
}

.icon-bid {
  background: #f8d7da;
  color: #dc3545;
}

.notification-content {
  flex: 1;
}

.notification-content h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
}

.notification-content p {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #6c757d;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.mark-read {
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: 18px;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.notification-item-enter-active,
.notification-item-leave-active {
  transition: all 0.3s;
}

.notification-item-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (max-width: 768px) {
  .notifications-center {
    padding: 10px;
  }

  .notifications-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .notification-filters {
    gap: 5px;
  }

  .filter-tab {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>
