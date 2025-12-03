# KODO API - Test Examples

This file contains example API calls for testing all implemented endpoints.

## Authentication Endpoints

### Register New User
```bash
POST http://localhost:4000/api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "SecurePass123!",
  "role": "buyer"
}

# Expected Response: 201 Created
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "username": "newuser",
    "role": "buyer",
    "createdAt": "timestamp"
  }
}
```

### Login
```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "seller1@example.com",
  "password": "Password123!"
}

# Expected Response: 200 OK
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "seller1@example.com",
    "username": "seller1",
    "role": "seller"
  }
}
```

### Get Profile (Protected)
```bash
GET http://localhost:4000/api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN

# Expected Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "seller1@example.com",
    "username": "seller1",
    "role": "seller",
    "lastKnownLat": null,
    "lastKnownLng": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

---

## Products Endpoints

### Get All Products (Public)
```bash
GET http://localhost:4000/api/products?page=1&limit=10&search=wireless&sortBy=price&sortOrder=asc

# Expected Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "title": "Wireless Bluetooth Headphones",
      "description": "High-quality...",
      "price": 129.99,
      "sellerId": "uuid",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "seller": {
        "id": "uuid",
        "username": "seller1",
        "email": "seller1@example.com"
      },
      "_count": {
        "bids": 2,
        "orders": 0
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### Get Single Product (Public)
```bash
GET http://localhost:4000/api/products/{productId}

# Expected Response: 200 OK
{
  "product": {
    "id": "uuid",
    "title": "Wireless Bluetooth Headphones",
    "description": "High-quality wireless headphones...",
    "price": 129.99,
    "sellerId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "seller": {
      "id": "uuid",
      "username": "seller1",
      "email": "seller1@example.com",
      "createdAt": "timestamp"
    },
    "bids": [
      {
        "id": "uuid",
        "amount": 110.00,
        "message": "Can you do $110?",
        "status": "open",
        "buyer": {
          "id": "uuid",
          "username": "buyer1"
        }
      }
    ],
    "_count": {
      "bids": 1,
      "orders": 0
    }
  }
}
```

### Create Product (Seller Only)
```bash
POST http://localhost:4000/api/products
Authorization: Bearer SELLER_JWT_TOKEN
Content-Type: application/json

{
  "title": "4K Gaming Monitor",
  "description": "27-inch 4K monitor with 144Hz refresh rate, HDR support",
  "price": 499.99
}

# Expected Response: 201 Created
{
  "message": "Product created successfully",
  "product": {
    "id": "uuid",
    "title": "4K Gaming Monitor",
    "description": "27-inch 4K monitor...",
    "price": 499.99,
    "sellerId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "seller": {
      "id": "uuid",
      "username": "seller1",
      "email": "seller1@example.com"
    }
  }
}
```

### Update Product (Owner Only)
```bash
PUT http://localhost:4000/api/products/{productId}
Authorization: Bearer SELLER_JWT_TOKEN
Content-Type: application/json

{
  "title": "4K Gaming Monitor - Updated",
  "price": 449.99
}

# Expected Response: 200 OK
{
  "message": "Product updated successfully",
  "product": {
    "id": "uuid",
    "title": "4K Gaming Monitor - Updated",
    "description": "27-inch 4K monitor...",
    "price": 449.99,
    "sellerId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "seller": {
      "id": "uuid",
      "username": "seller1",
      "email": "seller1@example.com"
    }
  }
}
```

### Delete Product (Owner Only)
```bash
DELETE http://localhost:4000/api/products/{productId}
Authorization: Bearer SELLER_JWT_TOKEN

# Expected Response: 200 OK
{
  "message": "Product deleted successfully"
}

# Error if product has orders: 400 Bad Request
{
  "error": true,
  "message": "Cannot delete product with existing orders",
  "code": "PRODUCT_HAS_ORDERS",
  "details": {
    "orderCount": 3
  }
}
```

---

## Protected Route Example

### Dashboard (Authenticated Users)
```bash
GET http://localhost:4000/api/dashboard
Authorization: Bearer YOUR_JWT_TOKEN

# Expected Response: 200 OK
{
  "message": "Welcome seller1@example.com, your role is seller",
  "user": {
    "id": "uuid",
    "email": "seller1@example.com",
    "username": "seller1",
    "role": "seller"
  }
}
```

---

## Error Response Examples

### 400 Bad Request (Validation Error)
```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "requestId": "uuid",
  "details": [
    {
      "field": "price",
      "message": "Price must be a positive number",
      "value": -10
    }
  ]
}
```

### 401 Unauthorized (No Token)
```json
{
  "error": true,
  "message": "Access token required",
  "code": "NO_TOKEN",
  "requestId": "uuid"
}
```

### 403 Forbidden (Wrong Role)
```json
{
  "error": true,
  "message": "Access denied. Required role: seller or admin",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": ["seller", "admin"],
    "current": "buyer"
  },
  "requestId": "uuid"
}
```

### 404 Not Found
```json
{
  "error": true,
  "message": "Product not found",
  "code": "PRODUCT_NOT_FOUND",
  "requestId": "uuid"
}
```

### 409 Conflict (Duplicate User)
```json
{
  "error": true,
  "message": "User with this email already exists",
  "code": "USER_EXISTS",
  "details": {
    "field": "email"
  }
}
```

### 429 Too Many Requests (Rate Limited)
```json
{
  "error": true,
  "message": "Too many authentication attempts, please try again after 15 minutes",
  "code": "AUTH_RATE_LIMIT_EXCEEDED"
}
```

### 500 Internal Server Error
```json
{
  "error": true,
  "message": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "uuid"
}
```

---

## PowerShell Test Script

```powershell
# Set base URL
$baseUrl = "http://localhost:4000"

# 1. Register new seller
$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    email = "testseller@example.com"
    username = "testseller"
    password = "Test123!"
    role = "seller"
  } | ConvertTo-Json)

Write-Host "✅ Registered: $($registerResponse.user.email)"

# 2. Login
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{
    emailOrUsername = "testseller@example.com"
    password = "Test123!"
  } | ConvertTo-Json)

$token = $loginResponse.token
Write-Host "✅ Logged in, token: $($token.Substring(0, 20))..."

# 3. Create product
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$productResponse = Invoke-RestMethod -Uri "$baseUrl/api/products" `
  -Method POST `
  -Headers $headers `
  -Body (@{
    title = "Test Product"
    description = "This is a test product"
    price = 99.99
  } | ConvertTo-Json)

Write-Host "✅ Created product: $($productResponse.product.title)"

# 4. Get all products
$productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/products?limit=5"
Write-Host "✅ Retrieved $($productsResponse.meta.total) products"

# 5. Get specific product
$product = Invoke-RestMethod -Uri "$baseUrl/api/products/$($productResponse.product.id)"
Write-Host "✅ Retrieved product: $($product.product.title)"

Write-Host "`n🎉 All tests passed!"
```

---

## Testing with cURL (Bash/WSL)

```bash
# Set variables
BASE_URL="http://localhost:4000"

# Login and get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"seller1@example.com","password":"Password123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Create product
curl -X POST "$BASE_URL/api/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Product",
    "description": "Product description",
    "price": 149.99
  }'

# Get all products
curl "$BASE_URL/api/products?page=1&limit=10"
```
