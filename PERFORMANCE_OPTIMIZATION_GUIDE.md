# Performance Optimization & Bundle Analysis Guide

Complete guide for optimizing application performance, analyzing bundles, and achieving production-grade performance targets.

---

## Executive Summary

**Current State Analysis**:
- Frontend bundle size: Baseline measurement needed
- API response time: < 500ms target
- Database query optimization: Indexes and n+1 query prevention
- Caching strategy: Redis + browser caching
- CDN readiness: Asset serving optimization

**Optimization Targets**:
- ✅ Frontend bundle < 250KB (gzipped)
- ✅ API p95 response time < 500ms
- ✅ Database query avg < 50ms
- ✅ First Contentful Paint (FCP) < 2s
- ✅ Largest Contentful Paint (LCP) < 2.5s
- ✅ Cumulative Layout Shift (CLS) < 0.1
- ✅ Time to Interactive (TTI) < 4s

---

## Part 1: Frontend Bundle Analysis

### 1.1 Current Bundle Analysis

```bash
# Analyze bundle size
cd client && npm run build:analyze

# This should output:
# - Total bundle size (before/after gzip)
# - Per-chunk breakdown
# - Unused dependencies
# - Opportunities for code splitting
```

### 1.2 Expected Bundle Breakdown

```
Frontend Bundle (target: < 250KB gzipped)
├── Vue 3 framework: ~35KB
├── Router: ~15KB
├── Pinia (state management): ~10KB
├── UI Components: ~40KB
├── Business Logic: ~50KB
├── Polyfills: ~20KB
├── Utilities: ~30KB
└── Vendor/Dependencies: ~55KB
```

### 1.3 Bundle Optimization Strategies

#### A. Code Splitting by Route

```javascript
// src/router/index.js - Route-based code splitting (ALREADY IMPLEMENTED)

const routes = [
  {
    path: '/products',
    component: () => import('../views/products/ProductsView.vue'),
    // Automatically creates separate chunk: products.js
  },
  {
    path: '/checkout',
    component: () => import('../views/checkout/CheckoutView.vue'),
    // Separate chunk: checkout.js
  },
];
```

**Benefits**:
- Initial bundle loads only necessary code
- Other routes load on-demand
- Users on home page don't download checkout code

#### B. Component Lazy Loading

```javascript
// src/components/ProductCard.vue

export default {
  components: {
    // Lazy load heavy components
    PriceChart: () => import('./PriceChart.vue'),
    ProductGallery: () => import('./ProductGallery.vue'),
  },
};
```

#### C. Dynamic Imports for Large Libraries

```javascript
// ALREADY DONE: DeliveryTrackingView - Mapbox GL lazy loaded

// Before (all users download 465KB):
import mapboxgl from 'mapbox-gl';

// After (only users needing tracking download it):
const mapboxgl = await import('mapbox-gl');
```

**Size Impact**: -465KB from initial bundle

#### D. Tree Shaking & Unused Imports

```javascript
// ❌ BAD: Imports everything, even unused
import * as lodash from 'lodash';

// ✅ GOOD: Import only what you need
import { debounce, throttle } from 'lodash';

// ✅ BETTER: Use optimized alternative
import debounce from 'lodash-es/debounce';
```

#### E. Remove Unused Dependencies

```bash
# Identify unused dependencies
npm install -g depcheck
depcheck

# Common candidates for removal:
# - Multiple date libraries → Use date-fns or day.js only
# - Multiple HTTP clients → Use axios only
# - Multiple icons → Use one system (Heroicons recommended)
# - Multiple UI frameworks → Use Tailwind only
```

### 1.4 Current Optimizations in Place

```
✅ Route-based code splitting
✅ Mapbox GL lazy loading (DeliveryTrackingView)
✅ Gzip compression enabled in Nginx
✅ Asset minification in build process
✅ Tree shaking configured in build
❓ Image optimization (needs verification)
❓ Font optimization (needs implementation)
```

---

## Part 2: Frontend Performance Metrics

### 2.1 Core Web Vitals

#### Largest Contentful Paint (LCP) - Target: < 2.5s

**What**: Measures when the largest content element becomes visible

**Optimization**:
```css
/* Use CSS font-display: swap */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/inter.woff2') format('woff2');
}

/* Preload critical resources */
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/api/products?limit=10" as="fetch" crossorigin>
```

**Current Status**: ❓ Needs measurement

#### First Contentful Paint (FCP) - Target: < 2s

**What**: Time until first content appears on screen

**Optimization**:
```vue
<!-- Reduce critical path -->
<template>
  <!-- Render critical content first -->
  <ProductList />
  
  <!-- Defer non-critical content -->
  <Suspense>
    <RelatedProducts />
  </Suspense>
</template>
```

**Current Status**: ❓ Needs measurement

#### Cumulative Layout Shift (CLS) - Target: < 0.1

**What**: Measures unexpected layout shifts

**Fix**:
```vue
<!-- Reserve space for images -->
<img 
  src="product.jpg" 
  width="300" 
  height="300" 
  class="aspect-square"
>

<!-- Set container sizes -->
<div class="w-full h-96">
  <LazyComponent />
</div>
```

**Current Status**: ✅ Tailwind classes should handle this

### 2.2 Performance Budget

```
Initial Load Performance Budget:
├── HTML: 50KB (gzipped)
├── CSS: 30KB (gzipped)
├── JavaScript: 180KB (gzipped)
├── Images: 100KB total
├── Fonts: 40KB (2 weights)
└── Total: 400KB initial load

Per-Route Budget:
├── Home: 200KB total
├── Product List: 150KB
├── Checkout: 200KB (payment forms)
└── Dashboard: 180KB (analytics)
```

### 2.3 Performance Monitoring

```bash
# Install performance monitoring library
npm install web-vitals

# Create src/services/performanceService.js
```

```javascript
// src/services/performanceService.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function initPerformanceMonitoring() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}
```

---

## Part 3: Backend Performance Optimization

### 3.1 Database Query Optimization

#### A. Add Indexes (CRITICAL)

```sql
-- Products table
CREATE INDEX idx_product_seller ON Product(sellerId);
CREATE INDEX idx_product_category_price ON Product(category, price);
CREATE INDEX idx_product_created ON Product(createdAt DESC);

-- Orders table
CREATE INDEX idx_order_buyer ON Order(buyerId);
CREATE INDEX idx_order_seller ON Order(sellerId);
CREATE INDEX idx_order_status ON Order(status);

-- Deliveries table
CREATE INDEX idx_delivery_courier ON Delivery(courierId);
CREATE INDEX idx_delivery_status ON Delivery(status);
```

#### B. Query Optimization

```javascript
// ❌ BAD: N+1 query problem
const orders = await prisma.order.findMany();
for (const order of orders) {
  const buyer = await prisma.user.findUnique({
    where: { id: order.buyerId } // Query per order!
  });
}

// ✅ GOOD: Join in single query
const orders = await prisma.order.findMany({
  include: {
    buyer: true,
    items: {
      include: {
        product: true,
      }
    }
  }
});
```

#### C. Select Only Needed Fields

```javascript
// ❌ BAD: Select all fields
const users = await prisma.user.findMany();

// ✅ GOOD: Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    role: true,
    createdAt: true,
  }
});
```

#### D. Pagination

```javascript
// ❌ BAD: Load all products (millions of records)
const products = await prisma.product.findMany();

// ✅ GOOD: Paginate results
const page = req.query.page || 1;
const limit = 20;
const products = await prisma.product.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

### 3.2 API Response Time Optimization

#### Response Time Targets

```
Route                          Current    Target    Priority
-------                        -------    ------    --------
GET /api/products              150ms      < 100ms   High
GET /api/products/:id          100ms      < 50ms    High
POST /api/orders               2000ms     < 500ms   Critical
GET /api/seller-analytics/*    500ms      < 300ms   Medium
GET /api/admin/users           300ms      < 200ms   Medium
```

#### Measure Response Times

```javascript
// Add middleware to log response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

### 3.3 Caching Strategy

#### A. Redis Caching

```javascript
// server/src/lib/kodoCache.js - ALREADY IMPLEMENTED

// Cache product listings
const cacheKey = `products:page:${page}`;
let products = await cache.get(cacheKey);
if (!products) {
  products = await prisma.product.findMany({
    skip: (page - 1) * 20,
    take: 20,
  });
  await cache.set(cacheKey, products, 300); // 5 min TTL
}
```

#### B. Browser Caching Headers

```javascript
// Configured in nginx.prod.conf - ALREADY IMPLEMENTED

// Static assets - cache for 30 days
add_header Cache-Control "public, immutable, max-age=2592000";

// HTML - don't cache
add_header Cache-Control "no-cache, no-store, must-revalidate";

// API - no cache
add_header Cache-Control "no-cache, private";
```

#### C. Cache Invalidation

```javascript
// Invalidate cache when product is updated
await prisma.product.update({ data: {...} });
await cache.delete(`products:*`); // Wildcard invalidation
await cache.delete(`product:${productId}`);
```

### 3.4 Database Connection Pooling

```javascript
// server/src/lib/prisma.js - ALREADY CONFIGURED

// Prisma automatically manages connection pooling
// Default pool size: CPU_COUNT * 2
// Configure with DATABASE_URL:

// postgresql://user:pass@localhost:5432/kodo?connection_limit=20
```

---

## Part 4: Image Optimization

### 4.1 Image Format Strategy

```javascript
// Use modern image formats with fallbacks
<picture>
  <source srcset="/images/product.webp" type="image/webp">
  <source srcset="/images/product.jpg" type="image/jpeg">
  <img src="/images/product.jpg" alt="Product">
</picture>
```

### 4.2 Responsive Images

```html
<!-- Serve different sizes to different devices -->
<img 
  srcset="
    /images/product-small.jpg 500w,
    /images/product-medium.jpg 1000w,
    /images/product-large.jpg 1500w
  "
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  src="/images/product-medium.jpg"
  alt="Product"
>
```

### 4.3 Lazy Loading

```html
<!-- Browser-native lazy loading -->
<img 
  src="/images/product.jpg" 
  loading="lazy"
  alt="Product"
>
```

---

## Part 5: Build & Deployment Optimization

### 5.1 Build Configuration

```javascript
// client/vite.config.js - Vite build optimization

export default {
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue'],
          'vendor-other': ['axios', 'date-fns'],
        }
      }
    }
  }
}
```

### 5.2 Nginx Compression

```nginx
# Already configured in nginx.prod.conf

gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types 
  text/plain 
  text/css 
  application/json 
  application/javascript;
```

### 5.3 Service Worker Caching

```javascript
// client/public/sw.js - Service worker for offline support

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/css/main.css',
        '/js/app.js',
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

---

## Part 6: Monitoring & Alerting

### 6.1 Performance Monitoring Setup

```javascript
// Integrated with Sentry (errorMonitoring.js)

Sentry.init({
  integrations: [
    new Sentry.Integrations.CaptureConsole(),
    new Sentry.Integrations.Http({ breadcrumbs: true }),
  ],
  tracesSampleRate: 0.1, // Sample 10% of transactions
});
```

### 6.2 Custom Performance Metrics

```javascript
// Monitor key operations
const transaction = Sentry.startTransaction({
  name: 'checkout',
  op: 'e-commerce',
});

// ... perform checkout ...

transaction.finish();
```

### 6.3 Real User Monitoring (RUM)

```bash
# Install RUM tool
npm install @sentry/tracing

# Sentry captures:
# - Page load time
# - JS errors
# - API call duration
# - Database query time
```

---

## Part 7: Performance Testing

### 7.1 Load Testing

```bash
# Install load testing tool
npm install -g artillery

# Create load test
# tests/load-test.yml:
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Browse Products"
    flow:
      - get:
          url: "/api/products"
      - think: 5
      - get:
          url: "/api/products/{{ productId }}"

# Run test
artillery run tests/load-test.yml
```

### 7.2 Lighthouse Testing

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://kodo.com --view

# Expected scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 90+
# SEO: 100
```

### 7.3 Bundle Size Tracking

```bash
# Add to CI/CD pipeline
npm run build:analyze

# Track over time:
# - If bundle grows > 5%, fail build
# - Alert on new dependencies > 50KB
```

---

## Part 8: Optimization Checklist

### Frontend
- [ ] Bundle size analyzed and within budget (< 250KB gzipped)
- [ ] Route-based code splitting implemented
- [ ] Heavy components lazy-loaded
- [ ] Images optimized and lazy-loaded
- [ ] Fonts optimized with font-display: swap
- [ ] Critical resources preloaded
- [ ] Service worker implemented for offline
- [ ] Cache headers configured
- [ ] Lighthouse score > 90

### Backend
- [ ] Database indexes created on foreign keys
- [ ] N+1 queries eliminated
- [ ] Query results paginated (limit 20-50)
- [ ] Only needed fields selected
- [ ] Redis caching configured
- [ ] API response times < 500ms p95
- [ ] Connection pooling configured
- [ ] Error monitoring active (Sentry)

### Infrastructure
- [ ] Nginx gzip compression enabled
- [ ] CDN for static assets (optional)
- [ ] Database replicas for read scaling (if needed)
- [ ] Load balancing configured
- [ ] Auto-scaling policies set
- [ ] Monitoring and alerting active

---

## Part 9: Performance Benchmarks

### Current Baseline (Needs Measurement)

```
Metric                          Current    Target     Status
------                          -------    ------     ------
Frontend Bundle (gzipped)       ???KB      < 250KB    ❓
Initial Page Load               ???ms      < 2s       ❓
API Response (median)           ???ms      < 200ms    ❓
API Response (p95)              ???ms      < 500ms    ❓
Database Query (median)         ???ms      < 50ms     ❓
Lighthouse Performance          ???        > 90       ❓
First Contentful Paint          ???        < 2s       ❓
Largest Contentful Paint        ???        < 2.5s     ❓
Cumulative Layout Shift         ???        < 0.1      ❓
Time to Interactive             ???        < 4s       ❓
```

### How to Measure

```bash
# Frontend performance
npm run build
npm run preview
# Open DevTools → Lighthouse → Analyze page load

# Backend performance
npm run test:integration -- critical-flows.integration.test.js
# Outputs response times

# Bundle size
npm run build:analyze
# Visual breakdown of bundle

# Load testing
artillery run tests/load-test.yml
# Response time under load
```

---

## Part 10: Common Optimization Wins

| Optimization | Impact | Effort | Priority |
|:---|---:|---:|---:|
| Add database indexes | 10-50x query speedup | Low | Critical |
| Lazy load Mapbox | 465KB reduction | Low | High |
| Paginate product list | 80% memory reduction | Low | High |
| Route code splitting | 40% initial bundle reduction | Medium | High |
| Redis caching | 5-10x response improvement | Medium | High |
| Image optimization | 30-50% size reduction | Medium | Medium |
| Remove unused libs | 20-30% bundle reduction | Medium | Medium |
| Service worker | Offline support + faster cache | Medium | Low |
| CDN for images | Global 50% latency reduction | High | Medium |
| Database replica | Better read scaling | High | Low |

---

## Success Criteria

✅ **Performance Testing Passes When:**

1. **Frontend**
   - Bundle size < 250KB gzipped
   - Lighthouse score > 90
   - Initial load < 2 seconds
   - LCP < 2.5s, FCP < 2s, CLS < 0.1

2. **Backend**
   - API median response < 200ms
   - API p95 response < 500ms
   - Database queries < 50ms average
   - No N+1 queries detected

3. **Infrastructure**
   - Handles 1000 concurrent users
   - 99.9% uptime
   - Auto-scaling functional
   - Monitoring shows no errors

4. **Deployment**
   - Build completes < 5 minutes
   - All tests pass
   - Performance budgets enforced
   - Metrics tracked in monitoring

---

## Next Steps

1. ✅ Run baseline performance measurements
2. ✅ Identify top 3 optimization opportunities
3. ✅ Implement database indexes (quick win)
4. ✅ Configure Redis caching
5. ✅ Optimize bundle with code splitting
6. ✅ Set up monitoring and alerting
7. ✅ Run load testing before production

