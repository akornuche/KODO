# Seller Onboarding System Documentation

## Overview

KODO implements a comprehensive 4-step seller onboarding process that ensures sellers specialize in specific niches, maintaining marketplace quality and specialization.

## Key Features

### 1. Niche Selection System
**Sellers must select and remain within a specific niche/category**

#### Available Niches
- Electronics
- Fashion  
- Home & Garden
- Sports & Outdoors
- Books & Media
- Toys & Games
- Health & Beauty
- Automotive
- Food & Beverages
- Jewelry & Accessories
- Art & Collectibles
- Pet Supplies
- Office Supplies
- Baby & Kids
- Other

#### Niche Enforcement
- Sellers select their niche during registration or onboarding
- Cannot create products outside their chosen niche
- API validates product categories against seller's niche
- Middleware blocks unauthorized category products

### 2. Onboarding Steps

#### Step 1: Niche Selection
- Choose primary specialization
- Optional: Select specific subcategories
- Required before listing products

#### Step 2: Business Information  
- Business/shop name (required)
- Business description (min 20 characters, required)
- Business logo (optional)

#### Step 3: Payment Setup
- Bank name (required)
- Account number (10 digits, required)
- Account name (required)
- Secure Flutterwave integration

#### Step 4: Verification
- Email verification (required)
- Phone verification (optional)
- Final approval

## Database Schema

### User Model Extensions
```prisma
model User {
  // ... existing fields
  firstName       String?
  lastName        String?
  businessName    String?
  sellerNiche     String?    // Primary niche
  sellerCategories String?   // JSON array of subcategories
  businessDescription String?
  businessLogo    String?
  taxId           String?
  verified        Boolean    @default(false)
  sellerOnboarded Boolean    @default(false)
  onboardingStep  Int        @default(0)
  
  @@index([sellerNiche])
  @@index([verified])
  @@index([sellerOnboarded])
}
```

## API Endpoints

### Seller Onboarding Routes
**Base URL**: `/api/seller-onboarding`

#### 1. Get Available Niches
```http
GET /api/seller-onboarding/niches
```

**Response**:
```json
{
  "niches": [
    {
      "value": "Electronics",
      "label": "Electronics",
      "subcategories": ["Smartphones", "Laptops", "Cameras", ...]
    }
  ]
}
```

#### 2. Get Onboarding Status
```http
GET /api/seller-onboarding/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "sellerOnboarded": false,
    "onboardingStep": 1,
    "sellerNiche": "Electronics"
  },
  "steps": [
    {
      "step": 1,
      "title": "Select Your Niche",
      "completed": true
    }
  ],
  "currentStep": 2,
  "isComplete": false
}
```

#### 3. Update Niche (Step 1)
```http
PUT /api/seller-onboarding/niche
Authorization: Bearer <token>
Content-Type: application/json

{
  "sellerNiche": "Electronics",
  "subcategories": ["Smartphones", "Laptops"]
}
```

#### 4. Update Business Info (Step 2)
```http
PUT /api/seller-onboarding/business
Authorization: Bearer <token>

{
  "businessName": "Tech World Store",
  "businessDescription": "Leading provider of electronics...",
  "businessLogo": "https://cdn.kodo.com/logo.jpg"
}
```

#### 5. Update Payment Info (Step 3)
```http
PUT /api/seller-onboarding/payment
Authorization: Bearer <token>

{
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "John Doe",
  "bankCode": "058"
}
```

#### 6. Complete Onboarding (Step 4)
```http
POST /api/seller-onboarding/complete
Authorization: Bearer <token>
```

**Response**:
```json
{
  "message": "Onboarding completed successfully!",
  "user": {
    "id": "uuid",
    "sellerOnboarded": true,
    "businessName": "Tech World Store",
    "sellerNiche": "Electronics"
  }
}
```

## Product Category Validation

### Validation Middleware
Products created by sellers are automatically validated against their niche:

```javascript
// Example: Seller with "Electronics" niche
POST /api/products
{
  "title": "Laptop",
  "category": "Electronics" // ✅ Allowed
}

POST /api/products
{
  "title": "T-Shirt",
  "category": "Fashion" // ❌ Blocked - not in seller's niche
}
```

**Error Response**:
```json
{
  "error": true,
  "message": "You can only sell products in your niche: Electronics",
  "code": "CATEGORY_NOT_ALLOWED",
  "allowedCategories": ["Electronics", "Smartphones", "Laptops"]
}
```

## Registration Flow

### Seller Registration
When registering as a seller, niche must be provided:

```http
POST /api/auth/register
{
  "email": "seller@example.com",
  "username": "techstore",
  "password": "secure123",
  "role": "seller",
  "firstName": "John",
  "lastName": "Doe",
  "sellerNiche": "Electronics", // Required for sellers
  "businessName": "Tech Store"
}
```

**Validation Rules**:
- `sellerNiche` is required when `role === 'seller'`
- Must be one of the predefined niches
- Sets `onboardingStep` to 1
- Sets `sellerOnboarded` to false

## Frontend Components

### SellerOnboarding.vue
**Location**: `client/src/components/SellerOnboarding.vue`

**Features**:
- Multi-step wizard interface
- Visual progress tracker
- Niche selection with icons
- Subcategory checkboxes
- Business information form
- Bank account setup
- Verification status
- Completion celebration

**Usage**:
```vue
<template>
  <SellerOnboarding />
</template>

<script>
import SellerOnboarding from '@/components/SellerOnboarding.vue';

export default {
  components: { SellerOnboarding }
};
</script>
```

## Benefits of Niche System

### For Marketplace Quality
1. **Specialization**: Sellers focus on their expertise
2. **Quality Control**: Easier to maintain category standards
3. **Trust**: Buyers know sellers are specialists
4. **Organization**: Better product categorization
5. **Searchability**: Improved search relevance

### For Sellers
1. **Brand Identity**: Establish expertise in a niche
2. **Marketing**: Target specific audiences
3. **Inventory Management**: Focus on core products
4. **Reduced Competition**: Compete within specialization
5. **Better Reviews**: Quality over quantity

### For Buyers
1. **Trust**: Buy from specialized sellers
2. **Quality**: Higher product standards
3. **Expertise**: Sellers know their products well
4. **Consistency**: Predictable shop experience
5. **Recommendations**: Better product suggestions

## Migration Guide

### For Existing Sellers
1. Run database migration to add new fields
2. Send email to existing sellers about niche selection
3. Set grace period (30 days) to complete onboarding
4. After grace period, restrict product creation until onboarding complete

### Database Migration
```bash
cd server
npx prisma migrate dev --name add_seller_niche_fields
```

Or manually apply:
```sql
-- See: server/prisma/migrations/add_seller_niche_fields.sql
```

## Admin Tools

### View Seller Statistics
- Sellers by niche distribution
- Onboarding completion rate
- Average time to complete onboarding
- Drop-off points in onboarding flow

### Manual Niche Change
Admins can change a seller's niche in special cases:
```http
PUT /api/admin/sellers/:id/niche
{
  "sellerNiche": "Fashion",
  "reason": "Business pivot approved"
}
```

## Best Practices

### For Sellers
1. **Choose carefully**: Niche is difficult to change
2. **Complete onboarding ASAP**: Required to list products
3. **Update business info**: Helps buyers trust you
4. **Verify account**: Required for payouts
5. **Stay within niche**: Maintain specialization

### For Platform
1. **Monitor niche distribution**: Ensure balanced marketplace
2. **Validate categories**: Prevent mismatched products
3. **Enforce onboarding**: Don't allow bypassing steps
4. **Track metrics**: Onboarding completion rates
5. **Support sellers**: Provide onboarding assistance

## Troubleshooting

### Seller Can't Create Products
**Issue**: "Please complete seller onboarding"
**Solution**: User must complete all 4 onboarding steps

### Category Not Allowed Error
**Issue**: "You can only sell products in your niche"
**Solution**: Product category must match seller's niche or subcategories

### Payment Setup Issues
**Issue**: Invalid account number
**Solution**: Must be 10-digit Nigerian bank account

### Verification Stuck
**Issue**: Email not verified
**Solution**: Resend verification email, check spam folder

## Future Enhancements

- [ ] Multi-niche sellers (premium feature)
- [ ] Niche change requests (admin approval)
- [ ] Niche-specific seller badges
- [ ] Niche performance analytics
- [ ] Automated niche suggestions based on listings
- [ ] Niche-specific seller training
- [ ] Cross-niche collaborations

## Related Documentation

- [API Documentation](./API_QUICK_REFERENCE.md)
- [User Authentication](./AUTHENTICATION.md)
- [Payment Integration](./PAYMENT_INTEGRATION.md)
- [SEO Guide](./SEO_GUIDE.md)

---

**Last Updated**: January 2024  
**Version**: 1.0.0
