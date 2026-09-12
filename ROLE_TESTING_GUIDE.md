# User Role Testing Guide

Comprehensive guide for testing all 4 user roles (admin, seller, buyer, courier) end-to-end.

---

## Quick Start

### Run Integration Tests

```bash
# Install dependencies (if not done)
cd server && npm install

# Run all role integration tests
npm run test:integration -- roles.integration.test.js

# Run with coverage
npm run test:coverage -- roles.integration.test.js

# Run in watch mode
npm run test:watch -- roles.integration.test.js
```

### Run Manual Verification Script

```bash
# Make sure server is running
npm start

# In another terminal, run verification
node server/tests/manual/verify-roles.js

# Expected output: Green checkmarks for all tests
```

---

## Role Definitions

### 1. **BUYER** 👤
- **Purpose**: Browse products, add to cart, place orders, track deliveries
- **Key Endpoints**:
  - `GET /api/products` - Browse products
  - `POST /api/cart` - Add to cart
  - `POST /api/orders` - Place order
  - `GET /api/orders` - View orders
  - `GET /api/cart` - View cart
  - `GET /api/wallet` - View wallet
- **Dashboard**: Buyer dashboard showing recent orders, wishlists, saved addresses
- **Restrictions**: Cannot create products, view admin panel, manage deliveries
- **Onboarding**: Shopping categories, delivery addresses, payment methods

### 2. **SELLER** 🏪
- **Purpose**: Create and manage products, track sales, analyze analytics
- **Key Endpoints**:
  - `POST /api/products` - Create product
  - `PUT /api/products/:id` - Edit product
  - `DELETE /api/products/:id` - Delete product
  - `GET /api/seller-analytics/overview` - Sales analytics
  - `GET /api/seller-analytics/orders` - Sales orders
  - `GET /api/seller-analytics/revenue` - Revenue report
  - `GET /api/seller-analytics/ratings` - Customer ratings
- **Dashboard**: Seller dashboard showing sales, revenue, ratings, products
- **Restrictions**: Cannot place orders, view admin panel, manage deliveries
- **Onboarding**: Business info, niche selection, payment methods (bank account)

### 3. **COURIER** 🚗
- **Purpose**: Accept deliveries, track routes, complete deliveries
- **Key Endpoints**:
  - `GET /api/deliveries` - View available deliveries
  - `POST /api/deliveries/:id/accept` - Accept delivery
  - `PUT /api/deliveries/:id/status` - Update delivery status
  - `GET /api/deliveries/:id/tracking` - Real-time tracking
  - `POST /api/deliveries/:id/proof` - Upload proof of delivery
- **Dashboard**: Courier dashboard showing active deliveries, earnings, ratings
- **Restrictions**: Cannot create products, place orders, view admin panel
- **Onboarding**: Vehicle info, government ID, service areas, guarantor info

### 4. **ADMIN** 👑
- **Purpose**: Manage users, disputes, analytics, platform moderation
- **Key Endpoints**:
  - `GET /api/admin/users` - All users with filtering
  - `PUT /api/admin/users/:id/role` - Change user role
  - `DELETE /api/admin/users/:id` - Delete user
  - `GET /api/admin/stats` - Platform statistics
  - `GET /api/admin/analytics` - Detailed analytics
  - `GET /api/admin/orders` - All orders with filtering
  - `GET /api/admin/disputes` - Dispute resolution
  - `PUT /api/admin/disputes/:id/resolve` - Resolve dispute
  - `GET /api/admin/products` - All products
  - `DELETE /api/admin/products/:id` - Delete product
- **Dashboard**: Admin dashboard showing platform metrics, user stats, revenue
- **Restrictions**: Must not perform buyer/seller/courier actions directly (manage only)

---

## Test Scenarios

### Scenario 1: Buyer Registration & Login

```bash
# Step 1: Register
POST /api/auth/register
{
  "email": "buyer@example.com",
  "username": "buyer_user",
  "password": "BuyerPass123!",
  "role": "buyer",
  "firstName": "John",
  "lastName": "Doe"
}

# Expected Response (201):
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "buyer@example.com",
    "role": "buyer",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2026-08-04T..."
  }
}

# Step 2: Login
POST /api/auth/login
{
  "emailOrUsername": "buyer@example.com",
  "password": "BuyerPass123!"
}

# Expected Response (200): Same as registration

# Step 3: Access Dashboard
GET /api/protected/dashboard
Authorization: Bearer <token>

# Expected Response (200): Buyer dashboard data
```

### Scenario 2: Seller Registration & Product Creation

```bash
# Step 1: Register as Seller
POST /api/auth/register
{
  "email": "seller@example.com",
  "username": "seller_user",
  "password": "SellerPass123!",
  "role": "seller",
  "firstName": "Jane",
  "lastName": "Doe",
  "businessName": "Jane's Electronics",
  "sellerNiche": "Electronics"
}

# Expected Response (201): Seller user with sellerOnboarded: false

# Step 2: Access Seller Onboarding
GET /api/seller-onboarding/niches
Authorization: Bearer <token>

# Expected Response (200): List of available niches

# Step 3: Create Product (after onboarding)
POST /api/products
Authorization: Bearer <token>
{
  "title": "iPhone 15",
  "description": "Latest iPhone model",
  "price": 999.99,
  "category": "Electronics",
  "stockQuantity": 50,
  "condition": "new"
}

# Expected Response (201): Product created with seller ID

# Step 4: View Analytics
GET /api/seller-analytics/overview
Authorization: Bearer <token>

# Expected Response (200): Sales, revenue, ratings data
```

### Scenario 3: Courier Registration & Delivery Management

```bash
# Step 1: Register as Courier
POST /api/auth/register
{
  "email": "courier@example.com",
  "username": "courier_user",
  "password": "CourierPass123!",
  "role": "courier",
  "firstName": "Bob",
  "lastName": "Driver"
}

# Expected Response (201): Courier user

# Step 2: Access Courier Onboarding
GET /api/courier-onboarding/vehicle-types
Authorization: Bearer <token>

# Expected Response (200): Available vehicle types

# Step 3: View Available Deliveries
GET /api/deliveries
Authorization: Bearer <token>

# Expected Response (200): Available deliveries for acceptance

# Step 4: Accept Delivery
POST /api/deliveries/:deliveryId/accept
Authorization: Bearer <token>

# Expected Response (200): Delivery accepted, status updated
```

### Scenario 4: Admin User Management

```bash
# Login as Admin
POST /api/auth/login
{
  "emailOrUsername": "admin@example.com",
  "password": "AdminPass123!"
}

# Step 1: View All Users
GET /api/admin/users
Authorization: Bearer <admin-token>

# Expected Response (200): Paginated list of users with filters

# Step 2: Update User Role
PUT /api/admin/users/:userId/role
Authorization: Bearer <admin-token>
{
  "role": "seller"
}

# Expected Response (200): User role updated

# Step 3: View Platform Statistics
GET /api/admin/stats
Authorization: Bearer <admin-token>

# Expected Response (200): Total users, orders, revenue, etc.

# Step 4: Resolve Dispute
PUT /api/admin/disputes/:disputeId/resolve
Authorization: Bearer <admin-token>
{
  "resolution": "Refund buyer $50",
  "refundBuyer": true
}

# Expected Response (200): Dispute resolved
```

---

## Access Control Testing

### Test Matrix: Who Can Access What?

| Endpoint | Buyer | Seller | Courier | Admin |
|----------|-------|--------|---------|-------|
| `/api/cart` | ✅ | ❌ | ❌ | ❌ |
| `/api/products` (create) | ❌ | ✅ | ❌ | ❌ |
| `/api/seller-analytics/*` | ❌ | ✅ | ❌ | ✅ |
| `/api/deliveries` | ❌ | ❌ | ✅ | ❌ |
| `/api/admin/users` | ❌ | ❌ | ❌ | ✅ |
| `/api/admin/stats` | ❌ | ❌ | ❌ | ✅ |
| `/api/protected/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/profile` | ✅ | ✅ | ✅ | ✅ |
| `/api/orders` (view own) | ✅ | ✅* | ❌ | ✅ |

*Sellers can view orders they received, not place orders themselves

### Expected Error Responses

**Buyer accessing seller endpoint:**
```json
{
  "error": true,
  "message": "Access denied. Required role: seller",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": ["seller"],
    "current": "buyer"
  }
}
```

**No authentication:**
```json
{
  "error": true,
  "message": "Access token required",
  "code": "NO_TOKEN"
}
```

**Expired token:**
```json
{
  "error": true,
  "message": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

---

## Automated Test Coverage

### Integration Tests (roles.integration.test.js)

Covers 50+ test cases across 7 test suites:

1. **Buyer Flow** (10 tests)
   - Registration and login
   - Dashboard access
   - Profile access
   - Public endpoints
   - Role denial tests

2. **Seller Flow** (10 tests)
   - Registration and login
   - Dashboard access
   - Onboarding endpoints
   - Analytics access
   - Role denial tests

3. **Courier Flow** (10 tests)
   - Registration and login
   - Dashboard access
   - Courier onboarding
   - Deliveries endpoint
   - Role denial tests

4. **Admin Flow** (8 tests)
   - Login
   - Dashboard access
   - User management
   - Analytics access
   - Dispute management

5. **Cross-Role Access Control** (5 tests)
   - Buyer → Seller denial
   - Seller → Admin denial
   - Courier → Seller denial
   - No auth required
   - Invalid/expired tokens

6. **Token & Session Management** (3 tests)
   - JWT generation
   - Token validity
   - Token persistence

7. **Authentication Validation** (7 tests)
   - Invalid credentials
   - Non-existent user
   - Weak password
   - Invalid email
   - Duplicate email
   - Invalid role
   - Invalid niche

### Manual Verification Script (verify-roles.js)

Interactive script that:
- Creates test users for all 4 roles
- Tests registration and login
- Verifies dashboard access
- Tests role-specific endpoints
- Validates access control
- Displays colorized results
- Cleans up test data

---

## Running Tests in Different Environments

### Development

```bash
# Start with test database
NODE_ENV=test npm start

# In another terminal
npm run test:integration -- roles.integration.test.js

# Or run manual verification
node server/tests/manual/verify-roles.js
```

### Staging

```bash
# Connect to staging database
API_URL=https://staging-api.kodo.com node server/tests/manual/verify-roles.js
```

### Production (Read-Only)

```bash
# Use existing users (don't create new ones)
# Just verify they can still login and access endpoints
node server/tests/manual/verify-roles-readonly.js
```

---

## Troubleshooting

### Test Failures

**Issue: "Access token required" when token is set**
- Check token format: `Bearer <token>` (space required)
- Verify JWT_SECRET env var matches between registration and verification
- Check token expiration

**Issue: "Access denied" for correct role**
- Verify role in JWT matches required role
- Check middleware chain order in app.js
- Ensure authenticateToken runs before requireRole

**Issue: "User already exists"**
- Previous test didn't clean up properly
- Delete user from database manually: `DELETE FROM User WHERE email='test@example.com'`

### Common Errors

```
Error: ECONNREFUSED - Server not running
→ Start server: npm start

Error: INVALID_EMAIL format
→ Use proper email: user@example.com

Error: WEAK_PASSWORD
→ Password must be 8+ characters

Error: INVALID_NICHE (sellers)
→ Use approved niche: Electronics, Fashion, etc.
```

---

## Test Data

### Pre-created Admin User

For testing, a default admin account should exist:

```json
{
  "email": "admin@kodo.com",
  "password": "AdminPass123!",
  "role": "admin"
}
```

Create with:
```bash
node server/scripts/seed-admin.js
```

### Test Users Created by Integration Tests

All test users are automatically:
- Created before tests run
- Deleted after tests complete
- Use `test-{timestamp}` email pattern to avoid conflicts

---

## Verification Checklist

Before going live, verify:

- [ ] All 4 roles can register successfully
- [ ] All 4 roles can login successfully
- [ ] All 4 roles can access their dashboards
- [ ] Role-specific endpoints return correct data
- [ ] Cross-role access is properly denied (403)
- [ ] Unauthenticated access is denied (401)
- [ ] Invalid tokens are rejected (403)
- [ ] Expired tokens are rejected (403)
- [ ] Admin can manage other users
- [ ] Admin can view platform statistics
- [ ] Integration tests pass (50+ tests)
- [ ] Manual verification script succeeds
- [ ] No console errors during test runs
- [ ] Performance: all tests complete < 30 seconds
- [ ] Database is clean after tests

---

## Performance Targets

Expected test execution times:

| Test Suite | Duration | Status |
|-----------|----------|--------|
| Buyer (10 tests) | 2-3s | ✅ |
| Seller (10 tests) | 2-3s | ✅ |
| Courier (10 tests) | 2-3s | ✅ |
| Admin (8 tests) | 1-2s | ✅ |
| Access Control (5 tests) | 1-2s | ✅ |
| Token Management (3 tests) | 1s | ✅ |
| Auth Validation (7 tests) | 2-3s | ✅ |
| **Total** | **< 30s** | ✅ |

---

## Success Criteria

✅ **Test Passes When:**
1. All 4 roles can register with valid data
2. All 4 roles can login with correct credentials
3. Each role can access their role-specific endpoints
4. Each role is denied access to other role endpoints (403)
5. Unauthenticated users get 401 errors
6. Invalid credentials get 401 errors
7. Weak passwords get 400 errors
8. Duplicate emails get 409 errors
9. Admin can modify user roles
10. All 50+ integration tests pass
11. Manual verification script completes with green checkmarks

---

## Next Steps

After role testing passes:

1. ✅ **Task #7**: Verify all 4 user roles (CURRENT)
2. ⏭️ **Task #8**: Test critical user flows (login→checkout→order, delivery tracking)
3. ⏭️ **Task #9**: Performance optimization and bundle analysis
4. ⏭️ **Task #10**: Final deployment documentation and runbook

