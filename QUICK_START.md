# KODO Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- npm or yarn
- Git

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/akornuche/KODO.git
cd KODO
```

#### 2. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd ../client
npm install
```

#### 3. Environment Setup

**Server (.env):**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
STRIPE_SECRET_KEY="your-stripe-key"
FLUTTERWAVE_SECRET_KEY="your-flutterwave-key"
```

**Client (.env):**
```env
VITE_API_URL="http://localhost:3000"
```

#### 4. Database Setup
```bash
cd server
npx prisma migrate dev
npx prisma generate
```

#### 5. Start Development Servers

**Terminal 1 - Server:**
```bash
cd server
npm start
# Server runs on http://localhost:3000
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

---

## 👥 User Roles & Access

### Admin
- **Email**: admin@kodo.com
- **Features**:
  - User management
  - Product approval
  - Courier verification
  - System reports
  - Platform configuration

### Seller
- **Onboarding**: 4 steps (Niche, Business Info, Payment, Verification)
- **Features**:
  - Product listing
  - Order management
  - Sales reports
  - Payment settings
  - Business profile

### Buyer
- **Onboarding**: 3 steps (Personal Info, Addresses, Payment)
- **Features**:
  - Product browsing
  - Shopping cart
  - Order tracking
  - Multiple addresses
  - Reviews & ratings

### Courier
- **Onboarding**: 4 steps (Personal/Vehicle, Service Areas, Documents, Availability)
- **Features**:
  - Delivery assignments
  - Route management
  - Earnings tracking
  - Availability schedule
  - Performance metrics

---

## 🔑 Key Components

### Onboarding Components
| Component | Location | Lines | Steps |
|-----------|----------|-------|-------|
| SellerOnboarding | `client/src/components/SellerOnboarding.vue` | 850 | 4 |
| BuyerOnboarding | `client/src/components/BuyerOnboarding.vue` | 900 | 3 |
| CourierOnboarding | `client/src/components/CourierOnboarding.vue` | 1,350 | 4 |

### Core Components
| Component | Purpose |
|-----------|---------|
| ReportBuilder | Generate reports (PDF/CSV/JSON) |
| ProductCard | Display product information |
| OrderCard | Order summary & actions |
| DeliveryMap | Real-time delivery tracking |

---

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify-email/:token
POST /api/auth/resend-verification
```

### Products
```
GET    /api/products
GET    /api/products/:id
POST   /api/products (seller)
PUT    /api/products/:id (seller)
DELETE /api/products/:id (seller)
```

### Orders
```
GET  /api/orders (buyer/seller)
POST /api/orders (buyer)
GET  /api/orders/:id
PUT  /api/orders/:id/status (seller)
```

### Deliveries
```
GET   /api/deliveries (courier)
POST  /api/deliveries/:id/accept (courier)
PUT   /api/deliveries/:id/status (courier)
PATCH /api/deliveries/:id/location (courier)
```

### Buyer Onboarding
```
GET    /api/buyer-onboarding/status
POST   /api/buyer-onboarding/personal-info
GET    /api/buyer-onboarding/addresses
POST   /api/buyer-onboarding/addresses
PUT    /api/buyer-onboarding/addresses/:id
DELETE /api/buyer-onboarding/addresses/:id
PATCH  /api/buyer-onboarding/addresses/:id/default
POST   /api/buyer-onboarding/complete
```

### Courier Onboarding
```
GET    /api/courier-onboarding/status
POST   /api/courier-onboarding/personal-info
POST   /api/courier-onboarding/service-areas/local
DELETE /api/courier-onboarding/service-areas/local/:id
POST   /api/courier-onboarding/routes
DELETE /api/courier-onboarding/routes/:id
POST   /api/courier-onboarding/documents/upload
DELETE /api/courier-onboarding/documents/:type
POST   /api/courier-onboarding/guarantor
POST   /api/courier-onboarding/availability
POST   /api/courier-onboarding/preferences
POST   /api/courier-onboarding/complete
```

### Reporting
```
GET  /api/reports/dashboard
POST /api/reports/sales
POST /api/reports/orders
POST /api/reports/deliveries
POST /api/reports/users (admin)
```

---

## 🗄️ Database Schema

### Core Tables
- **User** - All user types with role-specific fields
- **Product** - Product listings with seller info
- **Order** - Order management
- **Delivery** - Delivery tracking
- **Review** - Product reviews

### Buyer Tables
- **Address** - Multiple delivery addresses with GPS
- **PaymentMethod** - Saved payment methods

### Courier Tables
- **CourierServiceArea** - Local delivery zones
- **CourierRoute** - Inter-city routes
- **CourierDocument** - Verification documents
- **CourierAvailability** - Weekly schedule
- **CourierPreferences** - Delivery preferences
- **CourierGuarantor** - Guarantor information
- **CourierAssignmentLog** - Assignment analytics

---

## 🎨 Component Usage

### Using Onboarding Components

**In a Route:**
```vue
<template>
  <BuyerOnboarding v-if="user.role === 'BUYER'" />
  <SellerOnboarding v-if="user.role === 'SELLER'" />
  <CourierOnboarding v-if="user.role === 'COURIER'" />
</template>

<script setup>
import BuyerOnboarding from '@/components/BuyerOnboarding.vue';
import SellerOnboarding from '@/components/SellerOnboarding.vue';
import CourierOnboarding from '@/components/CourierOnboarding.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
</script>
```

### Using SEO Composable

**Product Page:**
```vue
<script setup>
import { useProductSEO } from '@/composables/useSEO';

const product = ref({
  title: 'iPhone 13 Pro',
  description: 'Latest iPhone...',
  price: 450000,
  images: ['url'],
  // ...
});

useProductSEO(product);
</script>
```

**Category Page:**
```vue
<script setup>
import { useCategorySEO } from '@/composables/useSEO';

const category = ref('Electronics');
const productCount = ref(45);

useCategorySEO(category, productCount);
</script>
```

### Using Report Builder

```vue
<template>
  <ReportBuilder />
</template>

<script setup>
import ReportBuilder from '@/components/ReportBuilder.vue';
</script>
```

---

## 🧪 Testing

### Run Tests

**Server:**
```bash
cd server
npm test
```

**Client:**
```bash
cd client
npm test
```

### E2E Tests
```bash
cd client
npm run test:e2e
```

---

## 🏗️ Build for Production

### Server
```bash
cd server
npm run build
```

### Client
```bash
cd client
npm run build
# Output in dist/
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# Server logs
cd server
tail -f logs/app.log

# Database logs
cd server
tail -f logs/db.log
```

---

## 🔧 Common Commands

### Database
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Format code
npm run format
```

---

## 🐛 Troubleshooting

### Server won't start
1. Check if port 3000 is available
2. Verify DATABASE_URL in .env
3. Run `npx prisma generate`
4. Check for migration errors

### Client won't start
1. Check if port 5173 is available
2. Verify VITE_API_URL in .env
3. Clear node_modules and reinstall
4. Check browser console for errors

### Database issues
1. Delete `prisma/dev.db`
2. Run `npx prisma migrate reset`
3. Re-seed database if needed

### File upload failing
1. Verify Cloudinary credentials
2. Check file size (max 5MB)
3. Verify file type (images/PDF)

---

## 📚 Documentation

### Full Documentation
- **API Docs**: `/docs/API_DOCUMENTATION.md`
- **SEO Guide**: `/docs/SEO_AUDIT_REPORT.md`
- **Implementation**: `/docs/IMPLEMENTATION_PROGRESS.md`
- **Completion Report**: `/docs/FINAL_COMPLETION_REPORT.md`

### Component Docs
Each major component includes:
- Props documentation
- Events emitted
- Slots available
- Usage examples

---

## 🤝 Contributing

### Code Style
- Use Vue 3 Composition API
- Follow ESLint rules
- Write descriptive commit messages
- Add comments for complex logic

### Pull Request Process
1. Create feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Submit PR with description

---

## 📞 Support

### Issues
Report bugs on GitHub Issues

### Questions
- Email: support@kodo.com
- Docs: See `/docs/` folder

---

## 📄 License

MIT License - See LICENSE file

---

**Version**: 1.0  
**Last Updated**: November 22, 2025  
**Status**: Production Ready ✅
