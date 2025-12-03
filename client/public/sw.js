// Service Worker for Push Notifications
const CACHE_NAME = 'kodo-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  let data = {};

  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    image: data.image,
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    actions: data.actions || [],
    tag: data.type || 'general', // Group similar notifications
    renotify: true, // Show notification even if one with same tag exists
  };

  // Add vibration pattern for mobile devices
  if ('vibrate' in navigator) {
    options.vibrate = [200, 100, 200];
  }

  // Add custom sound (if supported)
  if ('sound' in options && options.sound) {
    // Note: Custom sounds require additional implementation
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'KODO', options)
  );
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  let url = '/';

  // Determine URL based on notification type and data
  switch (notificationData.category) {
    case 'orders':
      url = `/orders/${notificationData.orderId}`;
      break;
    case 'bids':
      url = `/products/${notificationData.productId}`;
      break;
    case 'payments':
      url = `/orders/${notificationData.orderId}`;
      break;
    case 'delivery':
      url = `/orders/${notificationData.orderId}`;
      break;
    default:
      url = '/';
  }

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view_order':
        url = `/orders/${notificationData.orderId}`;
        break;
      case 'view_product':
        url = `/products/${notificationData.productId}`;
        break;
      case 'view_bid':
        url = `/bids/${notificationData.bidId}`;
        break;
      case 'make_payment':
        url = `/orders/${notificationData.orderId}/payment`;
        break;
      case 'track_delivery':
        url = `/orders/${notificationData.orderId}/tracking`;
        break;
      case 'leave_review':
        url = `/orders/${notificationData.orderId}/review`;
        break;
      case 'respond_bid':
        url = `/bids/${notificationData.bidId}/respond`;
        break;
      default:
        // Default action
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }

        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions (if supported)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Function to handle background sync
async function doBackgroundSync() {
  try {
    // Implement background sync logic here
    // For example, retry failed API calls, sync offline data, etc.
    console.log('Performing background sync...');

    // You can make API calls here that will be retried when connectivity is restored
    // await fetch('/api/sync-offline-data');

  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Message received in SW:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic background sync triggered:', event.tag);

  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

// Function to sync content periodically
async function syncContent() {
  try {
    console.log('Syncing content...');

    // Implement periodic content sync logic
    // For example, refresh cached data, check for updates, etc.

  } catch (error) {
    console.error('Content sync failed:', error);
  }
}