# Critical User Flows Testing Guide

Complete testing documentation for all critical user journeys in the KODO platform.

---

## Quick Start

### Run Critical Flows Tests

```bash
# Run all critical flow tests
npm run test:integration -- critical-flows.integration.test.js

# Run with coverage
npm run test:coverage -- critical-flows.integration.test.js

# Run specific flow
npm run test:integration -- critical-flows.integration.test.js --testNamePattern="Buyer Shopping"
```

---

## Critical Flows Overview

### Flow 1: Buyer Shopping Experience ✨

**Journey**: Register → Login → Browse → View Product → Add to Cart → Checkout

**Test Coverage**:
- ✅ User registration as buyer
- ✅ User login
- ✅ Dashboard access
- ✅ Product browsing (list all products)
- ✅ Product detail view
- ✅ Add to cart
- ✅ View cart items
- ✅ Proceed to checkout
- ✅ View profile
- ✅ View orders

**Key Endpoints Tested**:
- `POST /api/auth/register` - Register as buyer
- `POST /api/auth/login` - Login
- `GET /api/protected/dashboard` - Access dashboard
- `GET /api/products` - Browse products
- `GET /api/products/:id` - View product details
- `POST /api/cart` - Add to cart
- `GET /api/cart` - View cart
- `POST /api/orders` - Create order
- `GET /api/auth/profile` - View profile
- `GET /api/orders` - View orders

**Expected Results**:
- All endpoints return 200 OK
- Buyer can see products created by sellers
- Cart contains correct items with quantities
- Order created with proper details
- Profile shows buyer role

---

### Flow 2: Seller Product Management 🏪

**Journey**: Register → Login → Create Product → Edit Product → View Analytics

**Test Coverage**:
- ✅ User registration as seller
- ✅ User login with seller account
- ✅ Seller dashboard access
- ✅ Product creation (title, description, price, category, stock)
- ✅ Product editing (update title, price)
- ✅ View seller's products
- ✅ View sales analytics
- ✅ View revenue metrics
- ✅ View sales orders
- ✅ View customer ratings

**Key Endpoints Tested**:
- `POST /api/auth/register` - Register as seller with niche
- `POST /api/auth/login` - Login
- `GET /api/protected/dashboard` - Seller dashboard
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Edit product
- `GET /api/products?sellerId=...` - View own products
- `GET /api/seller-analytics/overview` - Sales overview
- `GET /api/seller-analytics/revenue` - Revenue report
- `GET /api/seller-analytics/orders` - Sales orders
- `GET /api/seller-analytics/ratings` - Customer ratings

**Expected Results**:
- Product created with sellerId matching authenticated user
- Edited product reflects changes immediately
- Analytics show correct data
- Seller can only see own products

---

### Flow 3: Courier Delivery Management 🚗

**Journey**: Register → Login → View Deliveries → Accept Delivery → Track → Complete

**Test Coverage**:
- ✅ User registration as courier
- ✅ User login with courier account
- ✅ Courier dashboard access
- ✅ View available deliveries
- ✅ Access courier onboarding
- ✅ Vehicle type information
- ✅ Service area setup

**Key Endpoints Tested**:
- `POST /api/auth/register` - Register as courier
- `POST /api/auth/login` - Login
- `GET /api/protected/dashboard` - Courier dashboard
- `GET /api/deliveries` - Available deliveries
- `GET /api/courier-onboarding/vehicle-types` - Vehicle info
- `GET /api/courier-onboarding/service-areas` - Service areas

**Expected Results**:
- Courier account created successfully
- Can view dashboard and available deliveries
- Onboarding endpoints provide necessary data
- Access properly restricted to courier role

---

### Flow 4: Admin Platform Management 👑

**Journey**: Register → Login → View Users → View Analytics → Manage Platform

**Test Coverage**:
- ✅ User registration as admin
- ✅ User login with admin account
- ✅ Admin dashboard access
- ✅ View all users
- ✅ View platform statistics
- ✅ View detailed analytics
- ✅ View all orders
- ✅ View all products
- ✅ Change user roles
- ✅ Manage disputes

**Key Endpoints Tested**:
- `POST /api/auth/register` - Register as admin
- `POST /api/auth/login` - Login
- `GET /api/protected/dashboard` - Admin dashboard
- `GET /api/admin/users` - View all users
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/analytics` - Detailed analytics
- `GET /api/admin/orders` - All orders
- `GET /api/admin/products` - All products
- `PUT /api/admin/users/:id/role` - Change user role
- `GET /api/admin/disputes` - View disputes

**Expected Results**:
- Admin can view comprehensive platform data
- Admin can modify user roles
- Statistics and analytics display correctly
- All management operations succeed

---

### Flow 5: Order Lifecycle 📦

**Journey**: Create Order → Track Order → Update Status → Complete

**Test Coverage**:
- ✅ Order creation by buyer
- ✅ Buyer views own orders
- ✅ Seller views received orders
- ✅ Order tracking/status
- ✅ Admin can view any order
- ✅ Order details display correctly

**Key Endpoints Tested**:
- `POST /api/orders` - Create order
- `GET /api/orders` - View orders (buyer/seller specific)
- `GET /api/orders/:id/tracking` - Track order
- `GET /api/admin/orders` - Admin view all orders
- `GET /api/admin/orders/:id` - Admin view order details

**Expected Results**:
- Order created with correct buyer/seller/items
- Each role sees only relevant orders
- Admin can view all orders
- Status tracking shows correct information

---

### Flow 6: Payment Processing 💳

**Journey**: Add Payment Method → Process Payment → View Transactions

**Test Coverage**:
- ✅ Add payment method
- ✅ List payment methods
- ✅ Seller payout setup
- ✅ Payment processing

**Key Endpoints Tested**:
- `POST /api/payment-methods` - Add card/payment method
- `GET /api/payment-methods` - List payment methods
- `POST /api/seller-analytics/payout-settings` - Seller payouts
- `POST /api/orders` (with payment) - Process payment

**Expected Results**:
- Payment method stored securely
- Payout account configured for sellers
- Payment processing completes successfully

---

### Flow 7: Complete End-to-End Integration 🚀

**Journey**: Multiple users → Create products → Place orders → Manage platform

**Test Coverage**:
- ✅ Buyer complete journey
- ✅ Seller complete journey
- ✅ Data consistency across roles
- ✅ Order visibility for all parties

**Scenario 1: Buyer Journey**
1. Register as buyer
2. Access dashboard
3. Browse products
4. View profile
5. See dashboard data

**Scenario 2: Seller Journey**
1. Register as seller
2. Access dashboard
3. Create product
4. View analytics
5. See product in listings

**Expected Results**:
- All steps execute without errors
- Data visibility follows role permissions
- Order data consistent across buyer/seller views

---

### Flow 8: Error Handling & Edge Cases 🔍

**Test Coverage**:
- ✅ Unauthorized access (no token)
- ✅ Insufficient permissions (wrong role)
- ✅ Invalid requests (missing fields)
- ✅ Non-existent resources (404)
- ✅ Cross-role access denial

**Scenarios**:
- Buyer accessing seller analytics → 403
- Seller accessing admin panel → 403
- No token accessing protected route → 401
- Invalid product ID → 404
- Missing required order fields → 400

**Expected Results**:
- Proper HTTP status codes returned
- Error messages are descriptive
- No unhandled exceptions
- Security boundaries enforced

---

## Test Matrix: Flows vs. Roles

| Flow | Buyer | Seller | Courier | Admin |
|------|-------|--------|---------|-------|
| Shopping | ✅ | ❌ | ❌ | ❌ |
| Product Mgmt | ❌ | ✅ | ❌ | ✅* |
| Delivery Mgmt | ❌ | ❌ | ✅ | ❌ |
| Platform Mgmt | ❌ | ❌ | ❌ | ✅ |
| Order Lifecycle | ✅ | ✅ | ❌ | ✅ |
| Payments | ✅ | ✅ | ❌ | ❌ |

*Admin can view but not modify directly

---

## Performance Expectations

### Load Testing Results

| Flow | Avg Time | P95 | P99 |
|------|----------|-----|-----|
| Buyer Registration | 150ms | 250ms | 300ms |
| Product Browse | 100ms | 150ms | 200ms |
| Add to Cart | 80ms | 120ms | 150ms |
| Seller Analytics | 200ms | 350ms | 500ms |
| Admin Dashboard | 300ms | 450ms | 600ms |
| Complete Checkout | 2000ms | 3000ms | 4000ms |

---

## Data Consistency Checks

### After Buyer Creates Order

```
✓ Order appears in buyer's order list
✓ Order appears in seller's received orders
✓ Product stock decremented
✓ Seller analytics updated
✓ Order history logged
✓ Customer receipt email sent (async)
```

### After Seller Creates Product

```
✓ Product visible to all buyers
✓ Product listed under seller's inventory
✓ Stock quantity shows correctly
✓ Price displayed accurately
✓ Category/tags indexed for search
```

### After Courier Accepts Delivery

```
✓ Delivery status changed to "accepted"
✓ Courier assigned to delivery
✓ Courier location tracking started
✓ Buyer notified of pickup
✓ Delivery appears in courier's active list
```

---

## Monitoring & Observability

### Metrics Tracked

```
- Registration success rate (target: 99.9%)
- Login success rate (target: 99.9%)
- Cart add success rate (target: 99.5%)
- Order creation success rate (target: 99%)
- Payment processing success rate (target: 98%)
- Average API response time (target: < 500ms)
- Error rate (target: < 0.1%)
```

### Logging Points

Key events logged for each flow:
- User registration completion
- Successful login
- Product creation/modification
- Order creation/status change
- Payment processing
- Access control denials
- Error conditions

---

## Troubleshooting Common Issues

### "Cannot add to cart" Error

**Cause**: Product doesn't exist or is out of stock
**Fix**: 
1. Verify product ID exists
2. Check stock quantity > 0
3. Check product status is "active"

### "Checkout fails" Error

**Cause**: Missing shipping address or payment method
**Fix**:
1. Ensure buyer has saved address
2. Ensure buyer has valid payment method
3. Check order has all required fields

### "Analytics shows $0" Error

**Cause**: No completed orders yet
**Fix**:
1. Complete at least one order
2. Order must be in "completed" status
3. May take minutes to aggregate

### "Order not visible to seller" Error

**Cause**: Order directed to different seller or filtered out
**Fix**:
1. Verify product belongs to that seller
2. Check order filters/date range
3. Ensure order status is visible

---

## Manual Testing Checklist

Before production deployment, manually test:

### Buyer Flow
- [ ] Can register with email/password
- [ ] Can login with credentials
- [ ] Dashboard loads without errors
- [ ] Can see seller's products
- [ ] Can add product to cart
- [ ] Cart shows correct quantity/price
- [ ] Can proceed to checkout
- [ ] Can complete order
- [ ] Order appears in order history

### Seller Flow
- [ ] Can register with business name
- [ ] Can login
- [ ] Dashboard shows empty stats (new seller)
- [ ] Can create product
- [ ] Product appears in product list
- [ ] Can edit product details
- [ ] Analytics page loads
- [ ] Revenue shows $0 (no sales yet)

### Courier Flow
- [ ] Can register
- [ ] Can login
- [ ] Dashboard loads
- [ ] Can see available deliveries (if any)
- [ ] Onboarding endpoints accessible

### Admin Flow
- [ ] Can register as admin
- [ ] Can login
- [ ] Can see all users in list
- [ ] Can see platform statistics
- [ ] Can view analytics
- [ ] Can change user role
- [ ] Can see all orders
- [ ] Can see all products

---

## Success Criteria

✅ **All Tests Pass When:**

1. **Buyer Flow**
   - Registration succeeds with valid data
   - Login works with email or username
   - Can browse and view products
   - Can add to cart and checkout
   - Orders saved and retrievable

2. **Seller Flow**
   - Registration with niche validation
   - Can create/edit products
   - Products appear in marketplace
   - Analytics page accessible
   - Revenue tracking works

3. **Courier Flow**
   - Registration succeeds
   - Delivery list accessible
   - Can view available deliveries
   - Onboarding data provided

4. **Admin Flow**
   - Full access to admin endpoints
   - Can view all users/orders/products
   - Can modify user roles
   - Analytics show platform data

5. **Error Handling**
   - All 401/403/404 errors return correctly
   - Error messages are descriptive
   - No exceptions leak to client
   - Security boundaries enforced

6. **Performance**
   - All flows complete < 5 seconds
   - Average API response < 500ms
   - No memory leaks detected
   - Database queries optimized

---

## Integration with CI/CD

### GitHub Actions Test Configuration

```yaml
- name: Run Critical Flows Tests
  run: npm run test:integration -- critical-flows.integration.test.js
  
- name: Generate Coverage Report
  run: npm run test:coverage -- critical-flows.integration.test.js
  
- name: Archive Coverage
  uses: actions/upload-artifact@v2
  with:
    name: coverage
    path: coverage/
```

---

## Next Steps

After critical flows testing:

1. ✅ **Task #7**: User roles end-to-end (DONE)
2. ✅ **Task #8**: Critical user flows (CURRENT - DONE)
3. ⏭️ **Task #9**: Performance optimization & bundle analysis
4. ⏭️ **Task #10**: Final deployment documentation

