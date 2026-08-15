# KODO API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:4000/api`  
**Last Updated:** November 14, 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Products](#products)
3. [Bids & Requests](#bids--requests)
4. [Orders & Payments](#orders--payments)
5. [Deliveries](#deliveries)
6. [Admin](#admin)
7. [Error Responses](#error-responses)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!",
  "role": "buyer"  // buyer, seller, courier
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "buyer"
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "user@example.com",  // email or username
  "password": "Password123!"
}
```

### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

---

## Products

### List Products
```http
GET /api/products?page=1&limit=20&search=laptop&sellerId=uuid&minPrice=100&maxPrice=1000&sortBy=price&sortOrder=asc
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search in title/description
- `sellerId` (uuid): Filter by seller
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `sortBy` (string): Sort field (createdAt, price, title)
- `sortOrder` (string): asc or desc

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Gaming Laptop",
      "description": "High-performance laptop",
      "price": 1299.99,
      "sellerId": "uuid",
      "seller": {
        "id": "uuid",
        "username": "seller1",
        "email": "seller1@example.com"
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Get Product
```http
GET /api/products/:id
```

### Create Product
```http
POST /api/products
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "title": "Gaming Laptop",
  "description": "High-performance laptop for gaming",
  "price": 1299.99
}
```

### Update Product
```http
PUT /api/products/:id
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "title": "Updated Gaming Laptop",
  "price": 1199.99
}
```

### Delete Product
```http
DELETE /api/products/:id
Authorization: Bearer <seller-token>
```

---

## Bids & Requests

### Create Request
```http
POST /api/requests
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "title": "Looking for gaming laptop",
  "message": "Need a good gaming laptop under $1500",
  "amount": 1400.00,
  "productId": "uuid"  // Optional: specific product, null for general request
}
```

**Response:**
```json
{
  "message": "Request created successfully",
  "bid": {
    "id": "uuid",
    "productId": "uuid",
    "buyerId": "uuid",
    "amount": 1400.00,
    "message": "Need a good gaming laptop under $1500",
    "status": "open",
    "buyer": { "id": "uuid", "username": "buyer1", "email": "buyer1@example.com" },
    "product": { "id": "uuid", "title": "Gaming Laptop", "price": 1299.99 },
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### List Requests
```http
GET /api/requests?page=1&limit=20&status=open
Authorization: Bearer <token>
```

### Get Request
```http
GET /api/requests/:id
Authorization: Bearer <token>
```

### Submit Offer (Seller)
```http
POST /api/requests/:id/offers
Authorization: Bearer <seller-token>
Content-Type: application/json

{
  "amount": 1250.00,
  "message": "I can offer you this laptop at $1250",
  "productId": "uuid"
}
```

**Response:**
```json
{
  "message": "Offer submitted successfully",
  "order": {
    "id": "uuid",
    "buyerId": "uuid",
    "productId": "uuid",
    "quantity": 1,
    "totalAmount": 1250.00,
    "status": "pending",
    "buyer": { "id": "uuid", "username": "buyer1", "email": "buyer1@example.com" },
    "product": {
      "id": "uuid",
      "title": "Gaming Laptop",
      "price": 1299.99,
      "seller": { "id": "uuid", "username": "seller1", "email": "seller1@example.com" }
    }
  },
  "note": "Order is pending buyer acceptance"
}
```

### Accept Offer (Buyer)
```http
PUT /api/requests/:id/accept
Authorization: Bearer <buyer-token>
```

### Update Bid Status
```http
PUT /api/requests/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "withdrawn"  // withdrawn or rejected
}
```

---

## Orders & Payments

### Get User Orders
```http
GET /api/orders?status=paid&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string): pending, paid, shipped, completed, cancelled, disputed
- `page` (number): Page number
- `limit` (number): Items per page

### Get Order
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "buyerId": "uuid",
    "productId": "uuid",
    "quantity": 1,
    "totalAmount": 1250.00,
    "status": "paid",
    "buyer": { "id": "uuid", "username": "buyer1", "email": "buyer1@example.com" },
    "product": {
      "id": "uuid",
      "title": "Gaming Laptop",
      "price": 1299.99,
      "seller": { "id": "uuid", "username": "seller1", "email": "seller1@example.com" }
    },
    "escrow": {
      "id": "uuid",
      "amount": 1250.00,
      "released": false,
      "paymentIntentId": "pi_xxx"
    },
    "delivery": {
      "id": "uuid",
      "status": "pending",
      "pickupAddress": "Seller location",
      "deliveryAddress": "Buyer location"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Pay for Order
```http
POST /api/orders/:id/pay
Authorization: Bearer <buyer-token>
Content-Type: application/json

{
  "paymentMethodId": "pm_card_visa"  // Stripe payment method ID
}
```

**Response:**
```json
{
  "message": "Payment successful",
  "order": { /* order with escrow */ },
  "escrow": {
    "id": "uuid",
    "amount": 1250.00,
    "released": false,
    "paymentIntentId": "pi_xxx"
  }
}
```

### Update Order Status
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped"  // pending, paid, shipped, completed, cancelled, disputed
}
```

### Refund Order
```http
POST /api/orders/:id/refund
Authorization: Bearer <buyer-token or admin-token>
Content-Type: application/json

{
  "reason": "Product not as described",
  "amount": 1250.00  // Optional: partial refund amount
}
```

**Response:**
```json
{
  "message": "Order refunded successfully",
  "order": { /* cancelled order */ },
  "refund": {
    "id": "re_xxx",
    "amount": 1250.00,
    "status": "succeeded"
  }
}
```

### Create Dispute
```http
POST /api/orders/:id/dispute
Authorization: Bearer <buyer-token or seller-token>
Content-Type: application/json

{
  "reason": "Product not received",
  "description": "I never received the product after 2 weeks"
}
```

### Release Escrow (Admin)
```http
POST /api/orders/escrow/:escrowId/release
Authorization: Bearer <admin-token>
```

---

## Deliveries

### Get Available Deliveries (Courier)
```http
GET /api/deliveries/available?lat=40.7128&lng=-74.0060&radius=50
Authorization: Bearer <courier-token>
```

**Query Parameters:**
- `lat` (number): Courier's latitude
- `lng` (number): Courier's longitude
- `radius` (number): Search radius in km (default: 50)

### Get Courier's Deliveries
```http
GET /api/deliveries?status=assigned
Authorization: Bearer <courier-token>
```

**Query Parameters:**
- `status` (string): pending, assigned, in_transit, delivered, failed

### Get Delivery
```http
GET /api/deliveries/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "delivery": {
    "id": "uuid",
    "orderId": "uuid",
    "courierId": "uuid",
    "status": "in_transit",
    "pickupAddress": "123 Seller St",
    "deliveryAddress": "456 Buyer Ave",
    "pickupLat": 40.7128,
    "pickupLng": -74.0060,
    "dropoffLat": 40.7580,
    "dropoffLng": -73.9855,
    "order": {
      "id": "uuid",
      "totalAmount": 1250.00,
      "buyer": { "id": "uuid", "username": "buyer1" },
      "product": {
        "id": "uuid",
        "title": "Gaming Laptop",
        "seller": { "id": "uuid", "username": "seller1" }
      }
    },
    "courier": {
      "id": "uuid",
      "username": "courier1",
      "email": "courier1@example.com",
      "lastKnownLat": 40.7300,
      "lastKnownLng": -73.9950
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Accept Delivery
```http
POST /api/deliveries/:id/accept
Authorization: Bearer <courier-token>
```

### Update Delivery Location
```http
PUT /api/deliveries/:id/location
Authorization: Bearer <courier-token>
Content-Type: application/json

{
  "lat": 40.7300,
  "lng": -73.9950
}
```

### Update Delivery Status
```http
PUT /api/deliveries/:id/status
Authorization: Bearer <courier-token>
Content-Type: application/json

{
  "status": "in_transit"  // assigned, in_transit, delivered, failed
}
```

---

## Admin

**Note:** All admin endpoints require `admin` role.

### Get All Users
```http
GET /api/admin/users?role=seller&search=john&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `role` (string): buyer, seller, courier, admin
- `search` (string): Search in username/email
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "seller1@example.com",
      "username": "seller1",
      "role": "seller",
      "stripeAccountId": "acct_xxx",
      "lastKnownLat": null,
      "lastKnownLng": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "_count": {
        "products": 5,
        "bids": 0,
        "orders": 12,
        "deliveries": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Update User Role
```http
PUT /api/admin/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "seller"  // buyer, seller, courier, admin
}
```

### Delete User
```http
DELETE /api/admin/users/:id
Authorization: Bearer <admin-token>
```

### Get Platform Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "stats": {
    "overview": {
      "totalUsers": 150,
      "totalProducts": 450,
      "totalBids": 320,
      "totalOrders": 280,
      "totalDeliveries": 200,
      "totalRevenue": 145678.50
    },
    "users": {
      "byRole": {
        "buyer": 80,
        "seller": 50,
        "courier": 15,
        "admin": 5
      }
    },
    "orders": {
      "byStatus": {
        "pending": 20,
        "paid": 30,
        "shipped": 25,
        "completed": 180,
        "cancelled": 15,
        "disputed": 10
      }
    },
    "deliveries": {
      "byStatus": {
        "pending": 15,
        "assigned": 20,
        "in_transit": 25,
        "delivered": 135,
        "failed": 5
      }
    }
  }
}
```

### Get Analytics
```http
GET /api/admin/analytics?period=30d
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `period` (string): 7d, 30d, 90d, 1y

**Response:**
```json
{
  "analytics": {
    "period": "30d",
    "dateRange": {
      "start": "2023-12-15T00:00:00Z",
      "end": "2024-01-15T00:00:00Z"
    },
    "metrics": {
      "totalOrders": 85,
      "totalRevenue": 45678.50,
      "newUsers": 25,
      "completedDeliveries": 70,
      "averageOrderValue": 537.39,
      "bidConversionRate": "65.50"
    },
    "revenueByDay": [
      { "date": "2023-12-15", "revenue": 1250.00 },
      { "date": "2023-12-16", "revenue": 2100.50 },
      // ...
    ]
  }
}
```

### Get All Orders (Admin View)
```http
GET /api/admin/orders?status=paid&buyerId=uuid&sellerId=uuid&page=1&limit=20
Authorization: Bearer <admin-token>
```

### Get All Disputes
```http
GET /api/admin/disputes?page=1&limit=20
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "disputes": [
    {
      "id": "uuid",
      "status": "disputed",
      "totalAmount": 1250.00,
      "buyer": { "id": "uuid", "username": "buyer1" },
      "product": {
        "id": "uuid",
        "title": "Gaming Laptop",
        "seller": { "id": "uuid", "username": "seller1" }
      },
      "escrow": { "id": "uuid", "amount": 1250.00, "released": false },
      "delivery": { "id": "uuid", "status": "delivered" },
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

### Resolve Dispute
```http
PUT /api/admin/disputes/:orderId/resolve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "resolution": "Product was delivered successfully. Dispute resolved in favor of seller.",
  "refundBuyer": false  // true to refund buyer, false to complete order normally
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": true,
  "message": "Error message",
  "code": "ERROR_CODE",
  "requestId": "uuid",
  "details": {}  // Optional: additional error details
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `ALREADY_EXISTS` | 409 | Resource already exists (e.g., email/username) |
| `INVALID_CREDENTIALS` | 401 | Incorrect email/username or password |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 10 requests | 15 minutes |
| Create Operations | 20 requests | 1 hour |

When rate limit is exceeded:
```json
{
  "error": true,
  "message": "Too many requests, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "requestId": "uuid",
  "retryAfter": 900  // seconds
}
```

---

## WebSocket Events (Socket.IO)

Connect to Socket.IO server:
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-token' }
});
```

### Events from Server

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection successful | `{ userId, role, timestamp }` |
| `newRequest` | New bid/request posted | `{ bid, timestamp }` |
| `newOffer` | Seller submitted offer | `{ offer, message, bid, timestamp }` |
| `offerAccepted` | Buyer accepted offer | `{ bid, order, timestamp }` |
| `orderUpdated` | Order status changed | `{ order, timestamp }` |
| `deliveryUpdated` | Delivery status/location updated | `{ delivery, timestamp }` |
| `newDelivery` | New delivery available | `{ delivery, timestamp }` |

### Events to Server

| Event | Description | Payload |
|-------|-------------|---------|
| `subscribeToRequest` | Subscribe to request updates | `requestId` |
| `unsubscribeFromRequest` | Unsubscribe from request | `requestId` |
| `subscribeToOrder` | Subscribe to order updates | `orderId` |
| `subscribeToDelivery` | Subscribe to delivery updates | `deliveryId` |
| `updateLocation` | Update courier location | `{ lat, lng }` |
| `ping` | Health check | - |

See [SOCKET_IO_GUIDE.md](./SOCKET_IO_GUIDE.md) for detailed WebSocket documentation.

---

## Webhooks

### Stripe Webhooks

```http
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: xxx
```

**Handled Events:**
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `transfer.created` - Funds transferred to seller
- `transfer.failed` - Transfer failed
- `charge.refunded` - Payment refunded

See [STRIPE_GUIDE.md](./STRIPE_GUIDE.md) for Stripe integration details.

---

## Testing

### Test Credentials
All users have password: `Password123!`

- **Admin:** `admin@kodo.com` / `admin`
- **Seller:** `seller1@kodo.com` / `seller1`
- **Buyer:** `buyer1@kodo.com` / `buyer1`
- **Courier:** `courier1@kodo.com` / `courier1`

### Test Cards (Stripe)
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 9995`
- **3D Secure:** `4000 0025 0000 3155`

---

## Resources

- **Setup Guide:** [SETUP.md](./SETUP.md)
- **API Testing:** [API_TESTS.md](./API_TESTS.md)
- **Socket.IO Guide:** [SOCKET_IO_GUIDE.md](./SOCKET_IO_GUIDE.md)
- **Stripe Guide:** [STRIPE_GUIDE.md](./STRIPE_GUIDE.md)
- **Progress Report:** [PROGRESS.md](./PROGRESS.md)

---

**Support:** For issues or questions, check the documentation files or server logs.
