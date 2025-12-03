import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/products/ProductsView.vue'),
    },
    {
      path: '/products/new',
      name: 'product-create',
      component: () => import('../views/products/ProductCreateView.vue'),
      meta: { requiresAuth: true, requiresRole: 'seller' },
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('../views/products/ProductDetailView.vue'),
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('../views/CartView.vue'),
      meta: { requiresAuth: true, requiresRole: 'buyer' },
    },
    {
      path: '/requests',
      name: 'requests',
      component: () => import('../views/requests/RequestsView.vue'),
    },
    {
      path: '/requests/create',
      name: 'create-request',
      component: () => import('../views/requests/CreateRequestView.vue'),
      meta: { requiresAuth: true, requiresRole: 'buyer' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/orders/OrdersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('../views/orders/OrderDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/deliveries',
      name: 'deliveries',
      component: () => import('../views/deliveries/DeliveriesView.vue'),
      meta: { requiresAuth: true, requiresRole: 'courier' },
    },
    {
      path: '/deliveries/:id',
      name: 'delivery-tracking',
      component: () => import('../views/deliveries/DeliveryTrackingView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/chat/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('../views/WalletView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/wishlist',
      name: 'wishlist',
      component: () => import('../views/WishlistView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/invoices',
      name: 'invoices',
      component: () => import('../views/InvoicesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/returns',
      name: 'returns',
      component: () => import('../views/ReturnsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('../views/SupportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('../views/FAQView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/addresses',
      name: 'addresses',
      component: () => import('../views/AddressesView.vue'),
      meta: { requiresAuth: true, requiresRole: 'buyer' },
    },
    {
      path: '/followed-sellers',
      name: 'followed-sellers',
      component: () => import('../views/FollowedSellersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminView.vue'),
      meta: { requiresAuth: true, requiresRole: 'admin' },
    },
    // New Enhanced Features Routes
    {
      path: '/features',
      name: 'features-overview',
      component: () => import('../components/EnhancedFeaturesOverview.vue'),
      meta: { requiresAuth: true, requiresRole: 'admin' },
    },
    {
      path: '/compare',
      name: 'product-comparison',
      component: () => import('../components/ProductComparison.vue'),
    },
    {
      path: '/digital-library',
      name: 'digital-library',
      component: () => import('../components/DigitalLibrary.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:orderId/track',
      name: 'order-tracking',
      component: () => import('../components/OrderTracking.vue'),
    },
    {
      path: '/seller/analytics',
      name: 'seller-analytics',
      component: () => import('../components/SellerAnalyticsDashboard.vue'),
      meta: { requiresAuth: true, requiresRole: 'seller' },
    },
    {
      path: '/settings/privacy',
      name: 'privacy-settings',
      component: () => import('../components/GDPRSettings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/subscriptions',
      name: 'subscriptions',
      component: () => import('../components/SubscriptionManager.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gift-cards',
      name: 'gift-cards',
      component: () => import('../components/GiftCards.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/seller/bulk-upload',
      name: 'bulk-upload',
      component: () => import('../components/BulkUpload.vue'),
      meta: { requiresAuth: true, requiresRole: 'seller' },
    },
    {
      path: '/admin/fraud-detection',
      name: 'fraud-detection',
      component: () => import('../components/FraudDetection.vue'),
      meta: { requiresAuth: true, requiresRole: 'admin' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
});

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const userRole = authStore.user?.role;

  // Guest routes (login, register)
  if (to.meta.guest && isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  // Protected routes
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  // Role-based routes
  if (to.meta.requiresRole && userRole !== to.meta.requiresRole) {
    return next({ name: 'dashboard' });
  }

  next();
});

export default router;
