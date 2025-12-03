# KODO API - New Features Quick Reference

## 🔖 **Favorites API**

### Get User's Favorites
```http
GET /api/favorites
Authorization: Bearer <token>
```

**Response:**
```json
{
  "favorites": ["product-id-1", "product-id-2"],
  "count": 2
}
```

### Add to Favorites
```http
POST /api/favorites/:productId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Product added to favorites",
  "productId": "product-id",
  "favorites": ["product-id-1", "product-id-2"]
}
```

### Remove from Favorites
```http
DELETE /api/favorites/:productId
Authorization: Bearer <token>
```

### Check if Favorited
```http
GET /api/favorites/check/:productId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "isFavorited": true
}
```

---

## 🎟️ **Coupons API**

### Validate Coupon
```http
POST /api/coupons/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE20",
  "orderAmount": 100.00
}
```

**Response:**
```json
{
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "type": "percentage",
    "value": 20,
    "discount": 20.00
  },
  "finalAmount": 80.00
}
```

### Create Coupon (Admin Only)
```http
POST /api/coupons
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "code": "NEWUSER10",
  "type": "percentage",
  "value": 10,
  "validFrom": "2025-01-01",
  "validUntil": "2025-12-31",
  "minOrderAmount": 50,
  "maxUsage": 1000,
  "maxUsagePerUser": 1
}
```

### List All Coupons (Admin Only)
```http
GET /api/coupons?active=true&limit=20
Authorization: Bearer <admin-token>
```

### Update Coupon (Admin Only)
```http
PUT /api/coupons/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "active": false
}
```

### Delete Coupon (Admin Only)
```http
DELETE /api/coupons/:id
Authorization: Bearer <admin-token>
```

---

## 🔍 **Advanced Search API**

### Main Search
```http
GET /api/search?q=laptop&category=electronics&minPrice=500&maxPrice=2000&location=Lagos&distance=50&sortBy=price_asc&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "query": "laptop",
  "type": "all",
  "results": [
    {
      "id": "prod-1",
      "type": "product",
      "title": "MacBook Pro",
      "price": 1999.99,
      "category": "electronics",
      "seller": { "id": "user-1", "username": "seller1" },
      "image": "https://...",
      "relevanceScore": 15
    }
  ],
  "counts": {
    "products": 45,
    "users": 3,
    "total": 48
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### Get Search Suggestions
```http
GET /api/search/suggestions?q=lap&limit=5
Authorization: Bearer <token>
```

**Response:**
```json
{
  "query": "lap",
  "suggestions": [
    {
      "text": "Laptop",
      "type": "product",
      "category": "Product Title"
    },
    {
      "text": "Laptop Bags",
      "type": "product",
      "category": "Product Title"
    }
  ]
}
```

### Save Search
```http
POST /api/search/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Affordable Laptops in Lagos",
  "query": "laptop",
  "filters": {
    "category": "electronics",
    "maxPrice": 1000,
    "location": "Lagos"
  }
}
```

### Get Saved Searches
```http
GET /api/search/saved
Authorization: Bearer <token>
```

**Response:**
```json
{
  "searches": [
    {
      "id": "search_1234567890",
      "name": "Affordable Laptops in Lagos",
      "query": "laptop",
      "filters": { "category": "electronics", "maxPrice": 1000 },
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Delete Saved Search
```http
DELETE /api/search/saved/:searchId
Authorization: Bearer <token>
```

---

## 🚚 **Shipping Calculator API**

### Calculate Shipping Cost
```http
POST /api/shipping/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "fromLocation": { "lat": 6.5244, "lng": 3.3792 },
  "toLocation": { "lat": 9.0820, "lng": 8.6753 },
  "weight": 2.5,
  "shippingMethod": "standard",
  "orderValue": 75.00
}
```

**Response:**
```json
{
  "distance": 456.78,
  "weight": 2.5,
  "available": true,
  "cost": 78.52,
  "method": "standard",
  "zone": "regional",
  "breakdown": {
    "baseRate": 5.00,
    "distanceCost": 68.52,
    "weightCost": 1.25,
    "zoneMultiplier": 1.3
  },
  "estimatedDays": {
    "min": 5,
    "max": 7
  },
  "estimatedDelivery": {
    "min": "2025-11-25",
    "max": "2025-11-27"
  }
}
```

### Get Available Shipping Options
```http
GET /api/shipping/options?distance=100&weight=3.5&orderValue=60
Authorization: Bearer <token>
```

**Response:**
```json
{
  "distance": 100,
  "weight": 3.5,
  "options": [
    {
      "method": "free",
      "displayName": "Free Shipping",
      "available": true,
      "cost": 0,
      "estimatedDays": { "min": 7, "max": 10 }
    },
    {
      "method": "standard",
      "displayName": "Standard Shipping",
      "available": true,
      "cost": 22.50,
      "estimatedDays": { "min": 5, "max": 7 }
    },
    {
      "method": "express",
      "displayName": "Express Shipping",
      "available": true,
      "cost": 39.80,
      "estimatedDays": { "min": 2, "max": 3 }
    }
  ],
  "count": 3
}
```

### Validate Shipping Address
```http
POST /api/shipping/validate-address
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": {
    "street": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos State",
    "postalCode": "100001",
    "country": "Nigeria"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Address is valid",
  "address": { ... }
}
```

### Calculate Distance
```http
GET /api/shipping/distance?fromLat=6.5244&fromLng=3.3792&toLat=9.0820&toLng=8.6753
Authorization: Bearer <token>
```

**Response:**
```json
{
  "distance": 456.78,
  "unit": "km",
  "from": { "lat": 6.5244, "lng": 3.3792 },
  "to": { "lat": 9.0820, "lng": 8.6753 }
}
```

### Generate Tracking Number (Seller/Admin Only)
```http
POST /api/shipping/generate-tracking
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "orderId": "order-123",
  "shippingMethod": "express"
}
```

**Response:**
```json
{
  "message": "Tracking number generated successfully",
  "trackingNumber": "EXP-ABC123-XYZ789-ORDER123",
  "shippingMethod": "express",
  "orderId": "order-123"
}
```

### Estimate Delivery Date
```http
GET /api/shipping/estimate-delivery?businessDays=5
Authorization: Bearer <token>
```

**Response:**
```json
{
  "businessDays": 5,
  "estimatedDelivery": "2025-11-27",
  "estimatedDeliveryFull": "2025-11-27T00:00:00.000Z"
}
```

---

## 🔔 **Notifications API** (Enhanced)

### Get Unread Notifications
```http
GET /api/notifications/unread
Authorization: Bearer <token>
```

### Mark Notifications as Read
```http
PUT /api/notifications/mark-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["notif-1", "notif-2"]
}
```

### Get Notification Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

### Update Notification Preferences
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": {
    "orderUpdates": true,
    "paymentNotifications": true,
    "deliveryUpdates": true
  },
  "push": {
    "orderUpdates": true,
    "deliveryUpdates": true
  }
}
```

---

## 📊 **Analytics API** (Existing)

### Get Dashboard Analytics
```http
GET /api/analytics/dashboard?range=30d
Authorization: Bearer <admin-token>
```

### Get Sales Analytics
```http
GET /api/analytics/sales
Authorization: Bearer <seller-token>
```

### Get Product Analytics
```http
GET /api/analytics/products
Authorization: Bearer <seller-token>
```

### Export Analytics
```http
GET /api/analytics/export?range=30d
Authorization: Bearer <admin-token>
```

**Response:** CSV file download

### Get Real-time Metrics
```http
GET /api/analytics/realtime
Authorization: Bearer <token>
```

**Response:**
```json
{
  "activeUsers": 24,
  "activeOrders": 12,
  "pendingDeliveries": 8,
  "todayRevenue": 5432.10
}
```

---

## 🔑 **Search Query Parameters**

### Filters
- `q` - Search query string
- `category` - Filter by category
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `location` - Location filter
- `distance` - Distance in km (5, 10, 25, 50, 100)
- `conditions` - Comma-separated (new, used, good, fair)
- `minRating` - Minimum seller rating (1-5)
- `hasDelivery` - Boolean
- `hasPickup` - Boolean
- `sortBy` - Sort order (relevance, price_asc, price_desc, date_desc, date_asc, rating_desc, distance_asc)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

### Example
```http
GET /api/search?q=phone&category=electronics&minPrice=200&maxPrice=500&location=Lagos&distance=25&conditions=new,used&minRating=4&hasDelivery=true&sortBy=price_asc&page=1&limit=20
```

---

## 🚚 **Shipping Methods**

| Method | Description | Base Rate | Speed | Free Eligibility |
|--------|-------------|-----------|-------|------------------|
| `standard` | Standard Shipping | $5.00 | 5-7 days | - |
| `express` | Express Shipping | $12.00 | 2-3 days | - |
| `overnight` | Overnight Delivery | $25.00 | 1 day | - |
| `free` | Free Shipping | $0.00 | 7-10 days | Orders $50+ (local only) |

---

## 🎟️ **Coupon Types**

| Type | Description | Value Format |
|------|-------------|--------------|
| `percentage` | Percentage discount | 0-100 |
| `fixed` | Fixed amount off | Dollar amount |
| `free_shipping` | Free shipping | - |

---

## 🔐 **Authentication**

All endpoints require Bearer token authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access
- **User:** All endpoints
- **Seller:** + Shipping tracking generation
- **Admin:** + Coupon management, all analytics

---

## 📝 **Response Formats**

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "requestId": "req-123456",
  "details": "Additional error details"
}
```

---

## 🚦 **Rate Limits**

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| Search | 30 requests | 15 minutes |
| Upload | 10 requests | 1 hour |
| Admin | 200 requests | 15 minutes |

---

## 💡 **Best Practices**

1. **Always include Authorization header** for authenticated endpoints
2. **Use pagination** for large result sets (search, analytics)
3. **Cache search suggestions** on the client side
4. **Validate addresses** before generating shipping labels
5. **Check coupon validity** before applying to orders
6. **Use appropriate shipping method** based on order urgency
7. **Handle rate limit errors** with exponential backoff
8. **Save searches** for repeat queries

---

## 🔗 **Related Documentation**

- [Security Audit](./server/SECURITY_AUDIT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Features Summary](./FEATURES_SUMMARY.md)
- [Implementation Complete](./IMPLEMENTATION_COMPLETE.md)

---

*Last Updated: November 20, 2025*  
*API Version: 1.0*  
*Base URL: `https://api.kodo.example.com`* (or `http://localhost:3000` for development)
