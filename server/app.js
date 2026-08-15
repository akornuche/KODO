require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const authRoutes = require('./src/routes/auth');
const protectedRoutes = require('./src/routes/protected');
const productRoutes = require('./src/routes/products');
const bidRoutes = require('./src/routes/bids');
const orderRoutes = require('./src/routes/orders');
const deliveryRoutes = require('./src/routes/deliveries');
const adminRoutes = require('./src/routes/admin');
const userRoutes = require('./src/routes/users');
const reviewRoutes = require('./src/routes/reviews');
const chatRoutes = require('./src/routes/chat');
const refundRoutes = require('./src/routes/refunds');
const notificationsRoutes = require('./src/routes/notifications');
const searchRoutes = require('./src/routes/search');
const uploadRoutes = require('./src/routes/upload');
const webhookRoutes = require('./src/routes/webhooks');
const analyticsRoutes = require('./src/routes/analytics');
const i18nRoutes = require('./src/routes/i18n');
const favoritesRoutes = require('./src/routes/favorites');
const couponsRoutes = require('./src/routes/coupons');
const shippingRoutes = require('./src/routes/shipping');
const socialRoutes = require('./src/routes/social');
const sellerOnboardingRoutes = require('./src/routes/sellerOnboarding');
const buyerOnboardingRoutes = require('./src/routes/buyerOnboarding');
const courierOnboardingRoutes = require('./src/routes/courierOnboarding');
const seoRoutes = require('./src/routes/seo');
const reportRoutes = require('./src/routes/reports');
const onboardingRoutes = require('./src/routes/onboarding');
const walletRoutes = require('./src/routes/wallet');
const wishlistRoutes = require('./src/routes/wishlist');
const variantRoutes = require('./src/routes/variants');
const invoiceRoutes = require('./src/routes/invoices');
const returnRoutes = require('./src/routes/returns');
const recommendationRoutes = require('./src/routes/recommendations');
const supportRoutes = require('./src/routes/support');
const productQARoutes = require('./src/routes/productQA');
const sellerFollowRoutes = require('./src/routes/sellerFollow');
const faqRoutes = require('./src/routes/faq');
const cartAbandonmentRoutes = require('./src/routes/cartAbandonment');
const settingsRoutes = require('./src/routes/settings');
const addressRoutes = require('./src/routes/addresses');
const digitalProductRoutes = require('./src/routes/digitalProducts');
const productComparisonRoutes = require('./src/routes/productComparison');
const bulkUploadRoutes = require('./src/routes/bulkUpload');
const recentlyViewedRoutes = require('./src/routes/recentlyViewed');
const sizeGuideRoutes = require('./src/routes/sizeGuides');
const reviewPhotoRoutes = require('./src/routes/reviewPhotos');
const bundleRoutes = require('./src/routes/bundles');
const orderTrackingRoutes = require('./src/routes/orderTracking');
const shippingLabelRoutes = require('./src/routes/shippingLabels');
const sellerAnalyticsRoutes = require('./src/routes/sellerAnalytics');
const fraudDetectionRoutes = require('./src/routes/fraudDetection');
const gdprRoutes = require('./src/routes/gdpr');
const guestCheckoutRoutes = require('./src/routes/guestCheckout');
const subscriptionRoutes = require('./src/routes/subscriptions');
const giftCardRoutes = require('./src/routes/giftCards');
const badgeRoutes = require('./src/routes/badges');
const rateLimiter = require('./src/lib/rateLimiter');
const kodoCache = require('./src/lib/kodoCache');
const securityManager = require('./src/lib/securityManager');
const auditLogger = require('./src/lib/auditLogger');
const i18nService = require('./src/lib/i18nService');
const { requestId, requestLogger } = require('./middleware/logging');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const mobileOptimization = require('./src/middleware/mobileOptimization');
const seoMiddleware = require('./src/middleware/seoMiddleware');
const logger = require('./src/lib/logger');

const app = express();

// Initialize cache and rate limiter
(async () => {
  try {
    await kodoCache.initialize();
    await auditLogger.initialize();
    // Connect rate limiter to the same Redis instance
    if (kodoCache.cacheManager.client && kodoCache.cacheManager.isConnected) {
      rateLimiter.initializeRedis(kodoCache.cacheManager.client);
    }
    logger.info('Cache, rate limiter, and audit logger initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
  }
})();

// Trust proxy (needed for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// Request ID and Logging (before other middleware)
app.use(requestId);
app.use(requestLogger);

// Mobile Detection (detect early, before response optimization)
app.use(mobileOptimization.detectMobile);

// SEO headers (add to all responses)
app.use(seoMiddleware.seoHeaders);

// Response compression (gzip/deflate)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS Configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Security Headers
app.use((req, res, next) => {
  const securityHeaders = securityManager.getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// Audit Logging Middleware
if (typeof auditLogger.auditMiddleware === 'function') {
  const auditMiddleware = auditLogger.auditMiddleware();
  if (typeof auditMiddleware === 'function') {
    app.use(auditMiddleware);
  }
}

// Locale Detection Middleware
app.use((req, res, next) => {
  const detectedLocale = i18nService.detectLocale(req);
  i18nService.setLocale(detectedLocale);
  req.locale = detectedLocale;
  next();
});

// Input Sanitization Middleware
app.use((req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = securityManager.sanitizeInput(req.query[key]);
      }
    });
  }

  // Sanitize body parameters (for non-file uploads)
  if (req.body && typeof req.body === 'object' && !req.is('multipart/form-data')) {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = securityManager.sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }

  next();
});

// Stripe webhooks (BEFORE body parsing - needs raw body)
app.use('/api/webhooks', webhookRoutes);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static('uploads'));

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// General rate limiting
app.use('/api/', rateLimiter.generalLimiter);

// Routes
app.get('/', (req, res) => res.json({ 
  message: 'KODO API is running',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}));

// SEO routes (robots.txt, sitemap.xml - serve before other routes)
app.use('/', seoRoutes);

// Apply auth rate limiter to auth routes
app.use('/api/auth', rateLimiter.authLimiter, authRoutes);
app.use('/api/products', mobileOptimization.optimizeResponse('product'), seoMiddleware.provideSEOData('products'), productRoutes);
app.use('/api/requests', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/notifications', rateLimiter.notificationLimiter, notificationsRoutes);
app.use('/api/search', rateLimiter.searchLimiter, searchRoutes);
app.use('/api/upload', rateLimiter.uploadLimiter, uploadRoutes);
app.use('/api/admin', rateLimiter.adminLimiter, adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/social', seoMiddleware.provideSEOData('seller'), socialRoutes);
app.use('/api/seller-onboarding', sellerOnboardingRoutes);
app.use('/api/buyer-onboarding', buyerOnboardingRoutes);
app.use('/api/courier-onboarding', courierOnboardingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api', productQARoutes);
app.use('/api', sellerFollowRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/cart', cartAbandonmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/digital-products', digitalProductRoutes);
app.use('/api/product-comparison', productComparisonRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use('/api/size-guides', sizeGuideRoutes);
app.use('/api/review-photos', reviewPhotoRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/order-tracking', orderTrackingRoutes);
app.use('/api/shipping-labels', shippingLabelRoutes);
app.use('/api/seller-analytics', sellerAnalyticsRoutes);
app.use('/api/fraud-detection', fraudDetectionRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/guest-checkout', guestCheckoutRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api', protectedRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
