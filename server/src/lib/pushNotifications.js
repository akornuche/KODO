const webPush = require('web-push');
const admin = require('firebase-admin');
const logger = require('./logger');
const prisma = require('./prisma');

// Initialize Firebase Admin SDK for mobile push notifications
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized for push notifications');
  } else {
    logger.warn('Firebase service account key not provided, mobile push notifications disabled');
  }
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK:', error.message);
}

// Configure web-push for browser notifications
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:' + (process.env.NOTIFICATION_EMAIL || 'noreply@kodo.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  logger.info('Web Push VAPID keys configured');
} else {
  logger.warn('VAPID keys not configured, browser push notifications disabled');
}

/**
 * Notification types and their configurations
 */
const NOTIFICATION_TYPES = {
  // Order notifications
  ORDER_PLACED: { category: 'orders', priority: 'high', icon: '🛒' },
  ORDER_PAID: { category: 'orders', priority: 'high', icon: '💰' },
  ORDER_SHIPPED: { category: 'orders', priority: 'normal', icon: '🚚' },
  ORDER_DELIVERED: { category: 'orders', priority: 'high', icon: '✅' },
  ORDER_COMPLETED: { category: 'orders', priority: 'normal', icon: '🎉' },
  ORDER_CANCELLED: { category: 'orders', priority: 'high', icon: '❌' },
  ORDER_DISPUTED: { category: 'orders', priority: 'high', icon: '⚠️' },

  // Bid notifications
  NEW_BID: { category: 'bids', priority: 'normal', icon: '💰' },
  BID_ACCEPTED: { category: 'bids', priority: 'high', icon: '✅' },
  BID_REJECTED: { category: 'bids', priority: 'normal', icon: '❌' },
  BID_EXPIRED: { category: 'bids', priority: 'low', icon: '⏰' },

  // Payment notifications
  PAYMENT_RECEIVED: { category: 'payments', priority: 'high', icon: '💳' },
  PAYMENT_FAILED: { category: 'payments', priority: 'high', icon: '❌' },
  REFUND_PROCESSED: { category: 'payments', priority: 'normal', icon: '↩️' },
  REFUND_REJECTED: { category: 'payments', priority: 'normal', icon: '❌' },

  // Delivery notifications
  DELIVERY_ASSIGNED: { category: 'delivery', priority: 'normal', icon: '🚚' },
  DELIVERY_PICKED_UP: { category: 'delivery', priority: 'normal', icon: '📦' },
  DELIVERY_IN_TRANSIT: { category: 'delivery', priority: 'low', icon: '🚛' },
  DELIVERY_OUT_FOR_DELIVERY: { category: 'delivery', priority: 'normal', icon: '🚚' },
  DELIVERY_DELIVERED: { category: 'delivery', priority: 'high', icon: '✅' },
  DELIVERY_FAILED: { category: 'delivery', priority: 'high', icon: '❌' },

  // System notifications
  ACCOUNT_VERIFIED: { category: 'account', priority: 'normal', icon: '✅' },
  PASSWORD_CHANGED: { category: 'account', priority: 'high', icon: '🔒' },
  PROFILE_UPDATED: { category: 'account', priority: 'low', icon: '👤' },

  // Marketing notifications (opt-in only)
  PROMOTIONAL: { category: 'marketing', priority: 'low', icon: '🎉' },
  NEW_PRODUCTS: { category: 'marketing', priority: 'low', icon: '🆕' },
};

/**
 * Send push notification to user
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 * @param {Object} options - Additional options
 */
async function sendPushNotification(userId, type, title, body, data = {}, options = {}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        deviceTokens: true, // JSON array of device tokens
        pushSubscriptions: true, // JSON array of web push subscriptions
        notificationPreferences: true, // JSON object with preferences
      },
    });

    if (!user) {
      logger.warn('User not found for push notification', { userId, type });
      return;
    }

    // Check user preferences
    const preferences = user.notificationPreferences || {};
    const pushPrefs = preferences.push || {};
    const categoryPrefs = pushPrefs[NOTIFICATION_TYPES[type]?.category] || true;

    if (!categoryPrefs) {
      logger.info('Push notification skipped due to user preferences', {
        userId,
        type,
        category: NOTIFICATION_TYPES[type]?.category,
      });
      return;
    }

    const notificationData = {
      type,
      userId,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        category: NOTIFICATION_TYPES[type]?.category,
      },
      priority: NOTIFICATION_TYPES[type]?.priority || 'normal',
      icon: NOTIFICATION_TYPES[type]?.icon || '🔔',
      ...options,
    };

    // Send to mobile devices via Firebase
    if (firebaseInitialized && user.deviceTokens && user.deviceTokens.length > 0) {
      await sendFirebaseNotification(user.deviceTokens, notificationData);
    }

    // Send to web browsers via Web Push
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      await sendWebPushNotification(user.pushSubscriptions, notificationData);
    }

    // Store notification in database for history
    await storeNotification(userId, notificationData);

    logger.info('Push notification sent successfully', {
      userId,
      type,
      title,
      hasMobileTokens: !!(user.deviceTokens && user.deviceTokens.length > 0),
      hasWebSubscriptions: !!(user.pushSubscriptions && user.pushSubscriptions.length > 0),
    });

  } catch (error) {
    logger.error('Failed to send push notification:', {
      userId,
      type,
      error: error.message,
    });
  }
}

/**
 * Send Firebase push notification to mobile devices
 * @param {Array} deviceTokens - Array of device tokens
 * @param {Object} notificationData - Notification data
 */
async function sendFirebaseNotification(deviceTokens, notificationData) {
  try {
    const message = {
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
      data: {
        type: notificationData.type,
        userId: notificationData.userId,
        category: notificationData.data.category,
        timestamp: notificationData.data.timestamp,
        ...notificationData.data,
      },
      android: {
        priority: notificationData.priority === 'high' ? 'high' : 'normal',
        notification: {
          icon: 'ic_notification',
          color: getCategoryColor(notificationData.data.category),
          sound: notificationData.priority === 'high' ? 'default' : undefined,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notificationData.title,
              body: notificationData.body,
            },
            sound: notificationData.priority === 'high' ? 'default' : undefined,
            badge: 1,
          },
        },
      },
      tokens: deviceTokens,
    };

    const response = await admin.messaging().sendMulticast(message);

    logger.info('Firebase notification sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokens: deviceTokens.length,
    });

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(deviceTokens[idx]);
        }
      });

      if (failedTokens.length > 0) {
        await removeInvalidDeviceTokens(notificationData.userId, failedTokens);
      }
    }

  } catch (error) {
    logger.error('Firebase notification error:', error.message);
  }
}

/**
 * Send web push notification to browsers
 * @param {Array} subscriptions - Array of push subscriptions
 * @param {Object} notificationData - Notification data
 */
async function sendWebPushNotification(subscriptions, notificationData) {
  try {
    const payload = JSON.stringify({
      title: notificationData.title,
      body: notificationData.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: notificationData.data,
      actions: getNotificationActions(notificationData.type),
      requireInteraction: notificationData.priority === 'high',
      silent: notificationData.priority === 'low',
    });

    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        webPush.sendNotification(subscription, payload)
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    logger.info('Web push notification sent', {
      successCount,
      failureCount,
      subscriptions: subscriptions.length,
    });

    // Handle failed subscriptions
    if (failureCount > 0) {
      const failedSubscriptions = [];
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          failedSubscriptions.push(subscriptions[idx]);
        }
      });

      if (failedSubscriptions.length > 0) {
        await removeInvalidPushSubscriptions(notificationData.userId, failedSubscriptions);
      }
    }

  } catch (error) {
    logger.error('Web push notification error:', error.message);
  }
}

/**
 * Store notification in database for history
 * @param {string} userId - User ID
 * @param {Object} notificationData - Notification data
 */
async function storeNotification(userId, notificationData) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
        priority: notificationData.priority,
        read: false,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to store notification:', error.message);
  }
}

/**
 * Get notification actions based on type
 * @param {string} type - Notification type
 * @returns {Array} Array of action objects
 */
function getNotificationActions(type) {
  const actions = {
    ORDER_PAID: [
      { action: 'view_order', title: 'View Order' },
      { action: 'track_delivery', title: 'Track Delivery' },
    ],
    ORDER_SHIPPED: [
      { action: 'track_delivery', title: 'Track Delivery' },
    ],
    ORDER_DELIVERED: [
      { action: 'leave_review', title: 'Leave Review' },
      { action: 'view_order', title: 'View Order' },
    ],
    BID_ACCEPTED: [
      { action: 'view_bid', title: 'View Bid' },
      { action: 'make_payment', title: 'Make Payment' },
    ],
    NEW_BID: [
      { action: 'view_product', title: 'View Product' },
      { action: 'respond_bid', title: 'Respond' },
    ],
  };

  return actions[type] || [{ action: 'view', title: 'View' }];
}

/**
 * Get category color for Android notifications
 * @param {string} category - Notification category
 * @returns {string} Color hex code
 */
function getCategoryColor(category) {
  const colors = {
    orders: '#10B981', // green
    bids: '#F59E0B', // amber
    payments: '#3B82F6', // blue
    delivery: '#8B5CF6', // purple
    account: '#6B7280', // gray
    marketing: '#EF4444', // red
  };
  return colors[category] || '#6B7280';
}

/**
 * Remove invalid device tokens
 * @param {string} userId - User ID
 * @param {Array} invalidTokens - Array of invalid tokens to remove
 */
async function removeInvalidDeviceTokens(userId, invalidTokens) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });

    if (user && user.deviceTokens) {
      const updatedTokens = user.deviceTokens.filter(token => !invalidTokens.includes(token));

      await prisma.user.update({
        where: { id: userId },
        data: { deviceTokens: updatedTokens },
      });

      logger.info('Invalid device tokens removed', {
        userId,
        removedCount: invalidTokens.length,
        remainingCount: updatedTokens.length,
      });
    }
  } catch (error) {
    logger.error('Failed to remove invalid device tokens:', error.message);
  }
}

/**
 * Remove invalid push subscriptions
 * @param {string} userId - User ID
 * @param {Array} invalidSubscriptions - Array of invalid subscriptions to remove
 */
async function removeInvalidPushSubscriptions(userId, invalidSubscriptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscriptions: true },
    });

    if (user && user.pushSubscriptions) {
      const updatedSubscriptions = user.pushSubscriptions.filter(sub =>
        !invalidSubscriptions.some(invalidSub =>
          JSON.stringify(sub) === JSON.stringify(invalidSub)
        )
      );

      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscriptions: updatedSubscriptions },
      });

      logger.info('Invalid push subscriptions removed', {
        userId,
        removedCount: invalidSubscriptions.length,
        remainingCount: updatedSubscriptions.length,
      });
    }
  } catch (error) {
    logger.error('Failed to remove invalid push subscriptions:', error.message);
  }
}

/**
 * Register device token for push notifications
 * @param {string} userId - User ID
 * @param {string} token - Device token
 * @param {string} platform - Platform (ios, android, web)
 */
async function registerDeviceToken(userId, token, platform = 'unknown') {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true },
    });

    const currentTokens = user?.deviceTokens || [];
    const tokenEntry = { token, platform, registeredAt: new Date().toISOString() };

    // Avoid duplicates
    const existingIndex = currentTokens.findIndex(t => t.token === token);
    if (existingIndex >= 0) {
      currentTokens[existingIndex] = tokenEntry;
    } else {
      currentTokens.push(tokenEntry);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deviceTokens: currentTokens },
    });

    logger.info('Device token registered', { userId, platform, tokenCount: currentTokens.length });
  } catch (error) {
    logger.error('Failed to register device token:', error.message);
    throw error;
  }
}

/**
 * Register web push subscription
 * @param {string} userId - User ID
 * @param {Object} subscription - Push subscription object
 */
async function registerPushSubscription(userId, subscription) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscriptions: true },
    });

    const currentSubscriptions = user?.pushSubscriptions || [];

    // Avoid duplicates
    const existingIndex = currentSubscriptions.findIndex(sub =>
      sub.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      currentSubscriptions[existingIndex] = { ...subscription, registeredAt: new Date().toISOString() };
    } else {
      currentSubscriptions.push({ ...subscription, registeredAt: new Date().toISOString() });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscriptions: currentSubscriptions },
    });

    logger.info('Push subscription registered', {
      userId,
      endpoint: subscription.endpoint,
      subscriptionCount: currentSubscriptions.length,
    });
  } catch (error) {
    logger.error('Failed to register push subscription:', error.message);
    throw error;
  }
}

/**
 * Get user's unread notifications
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Array} Array of notifications
 */
async function getUnreadNotifications(userId, limit = 50) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  } catch (error) {
    logger.error('Failed to get unread notifications:', error.message);
    return [];
  }
}

/**
 * Mark notifications as read
 * @param {string} userId - User ID
 * @param {Array} notificationIds - Array of notification IDs to mark as read
 */
async function markNotificationsAsRead(userId, notificationIds) {
  try {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId, // Ensure user can only mark their own notifications
      },
      data: { read: true, readAt: new Date() },
    });

    logger.info('Notifications marked as read', {
      userId,
      count: notificationIds.length,
    });
  } catch (error) {
    logger.error('Failed to mark notifications as read:', error.message);
  }
}

module.exports = {
  sendPushNotification,
  registerDeviceToken,
  registerPushSubscription,
  getUnreadNotifications,
  markNotificationsAsRead,
  NOTIFICATION_TYPES,
};