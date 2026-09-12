/**
 * Integration Tests for User Roles End-to-End
 * Tests all 4 user roles (admin, seller, buyer, courier) through complete flows
 * 
 * Test Scenarios:
 * 1. Buyer: Register → Login → View Dashboard → Browse Products → Add to Cart
 * 2. Seller: Register → Login → View Dashboard → Create Product → View Analytics
 * 3. Courier: Register → Login → View Dashboard → View Deliveries
 * 4. Admin: Register → Login → View Dashboard → Manage Users → View Analytics
 * 5. Cross-Role Access Control: Verify role-based access denial
 */

const request = require('supertest');
const app = require('../../app');
const prisma = require('../../src/lib/prisma');
const jwt = require('jsonwebtoken');

describe('User Roles Integration Tests', () => {
  // Test user data for each role
  const testUsers = {
    buyer: {
      email: 'buyer@test.com',
      username: 'buyer_user',
      password: 'BuyerPass123!',
      role: 'buyer',
      firstName: 'John',
      lastName: 'Buyer',
    },
    seller: {
      email: 'seller@test.com',
      username: 'seller_user',
      password: 'SellerPass123!',
      role: 'seller',
      firstName: 'Jane',
      lastName: 'Seller',
      businessName: 'Jane\'s Shop',
      sellerNiche: 'Electronics',
    },
    courier: {
      email: 'courier@test.com',
      username: 'courier_user',
      password: 'CourierPass123!',
      role: 'courier',
      firstName: 'Bob',
      lastName: 'Courier',
    },
    admin: {
      email: 'admin@test.com',
      username: 'admin_user',
      password: 'AdminPass123!',
      role: 'admin',
      firstName: 'Alice',
      lastName: 'Admin',
    },
  };

  // Store authenticated tokens for each role
  let tokens = {};
  let users = {};

  /**
   * SETUP: Clean database and create test users before all tests
   */
  beforeAll(async () => {
    try {
      // Clean up existing test users
      const testEmails = Object.values(testUsers).map(u => u.email);
      await prisma.user.deleteMany({
        where: { email: { in: testEmails } }
      });

      // Register each role
      for (const [role, userData] of Object.entries(testUsers)) {
        const res = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
        expect(res.body.user.role).toBe(role);

        tokens[role] = res.body.token;
        users[role] = res.body.user;

        console.log(`✓ Registered ${role}: ${userData.email}`);
      }
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  /**
   * CLEANUP: Delete test users after all tests
   */
  afterAll(async () => {
    try {
      const testEmails = Object.values(testUsers).map(u => u.email);
      await prisma.user.deleteMany({
        where: { email: { in: testEmails } }
      });
      console.log('✓ Cleaned up test users');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  /**
   * TEST SUITE 1: BUYER FLOW
   */
  describe('Buyer User Role', () => {
    it('should register as buyer successfully', async () => {
      const buyerData = {
        email: 'new-buyer@test.com',
        username: 'new_buyer',
        password: 'BuyerPass123!',
        role: 'buyer',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(buyerData)
        .expect(201);

      expect(res.body.user.role).toBe('buyer');
      expect(res.body.user.email).toBe(buyerData.email);
      expect(res.body.token).toBeDefined();

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: buyerData.email }
      });
    });

    it('should login as buyer successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.buyer.email,
          password: testUsers.buyer.password,
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('buyer');
      expect(res.body.user.email).toBe(testUsers.buyer.email);
    });

    it('should access buyer dashboard', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(200);

      expect(res.body).toBeDefined();
      // Dashboard should return welcome message or user data
      expect(res.body.user || res.body.message).toBeDefined();
    });

    it('should access own profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(200);

      expect(res.body.user.role).toBe('buyer');
      expect(res.body.user.email).toBe(testUsers.buyer.email);
    });

    it('should be able to view products (public endpoint)', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should NOT access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(res.body.message).toContain('Access denied');
    });

    it('should NOT access seller-only endpoints', async () => {
      const res = await request(app)
        .post('/api/seller-onboarding/niche')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .send({ niche: 'Electronics' })
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should NOT access courier-only endpoints', async () => {
      const res = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  /**
   * TEST SUITE 2: SELLER FLOW
   */
  describe('Seller User Role', () => {
    it('should register as seller successfully', async () => {
      const sellerData = {
        email: 'new-seller@test.com',
        username: 'new_seller',
        password: 'SellerPass123!',
        role: 'seller',
        businessName: 'New Shop',
        sellerNiche: 'Fashion',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(sellerData)
        .expect(201);

      expect(res.body.user.role).toBe('seller');
      expect(res.body.user.businessName).toBe(sellerData.businessName);
      expect(res.body.token).toBeDefined();

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: sellerData.email }
      });
    });

    it('should login as seller successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.seller.email,
          password: testUsers.seller.password,
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('seller');
    });

    it('should access seller dashboard', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access seller-specific onboarding endpoints', async () => {
      const res = await request(app)
        .get('/api/seller-onboarding/niches')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access seller analytics', async () => {
      const res = await request(app)
        .get('/api/seller-analytics/overview')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should NOT access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should NOT access courier-only endpoints', async () => {
      const res = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should NOT access buyer cart routes (seller has shop, not cart)', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(403);

      // Seller role should not have access to buyer cart
      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  /**
   * TEST SUITE 3: COURIER FLOW
   */
  describe('Courier User Role', () => {
    it('should register as courier successfully', async () => {
      const courierData = {
        email: 'new-courier@test.com',
        username: 'new_courier',
        password: 'CourierPass123!',
        role: 'courier',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(courierData)
        .expect(201);

      expect(res.body.user.role).toBe('courier');
      expect(res.body.token).toBeDefined();

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: courierData.email }
      });
    });

    it('should login as courier successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.courier.email,
          password: testUsers.courier.password,
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('courier');
    });

    it('should access courier dashboard', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access courier-specific onboarding endpoints', async () => {
      const res = await request(app)
        .get('/api/courier-onboarding/vehicle-types')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access deliveries endpoint', async () => {
      const res = await request(app)
        .get('/api/deliveries')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should NOT access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should NOT access seller-only endpoints', async () => {
      const res = await request(app)
        .get('/api/seller-analytics/overview')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should NOT access buyer cart', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  /**
   * TEST SUITE 4: ADMIN FLOW
   */
  describe('Admin User Role', () => {
    it('should login as admin successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.admin.email,
          password: testUsers.admin.password,
        })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('admin');
    });

    it('should access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin users endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin stats endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin analytics endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin orders endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin products endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should access admin disputes endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('should be able to update user role', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${users.buyer.id}/role`)
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ role: 'seller' })
        .expect(200);

      expect(res.body).toBeDefined();

      // Verify role was updated in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: users.buyer.id },
        select: { role: true }
      });
      expect(updatedUser.role).toBe('seller');

      // Revert back to buyer for other tests
      await prisma.user.update({
        where: { id: users.buyer.id },
        data: { role: 'buyer' }
      });
    });
  });

  /**
   * TEST SUITE 5: CROSS-ROLE ACCESS CONTROL
   */
  describe('Cross-Role Access Control', () => {
    it('should deny buyer access to seller analytics', async () => {
      const res = await request(app)
        .get('/api/seller-analytics/overview')
        .set('Authorization', `Bearer ${tokens.buyer}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny seller access to admin panel', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokens.seller}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny courier access to seller shop', async () => {
      const res = await request(app)
        .get('/api/seller-analytics/overview')
        .set('Authorization', `Bearer ${tokens.courier}`)
        .expect(403);

      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should require authentication for protected routes', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .expect(401);

      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: users.buyer.id, email: testUsers.buyer.email, role: 'buyer' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const res = await request(app)
        .get('/api/protected/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  /**
   * TEST SUITE 6: TOKEN AND SESSION MANAGEMENT
   */
  describe('Token and Session Management', () => {
    it('should generate valid JWT tokens on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.buyer.email,
          password: testUsers.buyer.password,
        })
        .expect(200);

      const token = res.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.id).toBe(users.buyer.id);
      expect(decoded.email).toBe(testUsers.buyer.email);
      expect(decoded.role).toBe('buyer');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should generate valid JWT tokens on registration', async () => {
      const newUser = {
        email: 'token-test@test.com',
        username: 'token_test',
        password: 'TokenTest123!',
        role: 'buyer',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      const token = res.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.email).toBe(newUser.email);
      expect(decoded.role).toBe('buyer');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: newUser.email }
      });
    });

    it('should maintain token integrity across requests', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.seller.email,
          password: testUsers.seller.password,
        })
        .expect(200);

      const token = loginRes.body.token;

      // Use token in multiple requests
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.user.id).toBe(users.seller.id);
        expect(res.body.user.role).toBe('seller');
      }
    });
  });

  /**
   * TEST SUITE 7: AUTHENTICATION VALIDATION
   */
  describe('Authentication Validation', () => {
    it('should reject login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUsers.buyer.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'nonexistent@test.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak-password@test.com',
          username: 'weak_user',
          password: '123', // Too short
          role: 'buyer',
        })
        .expect(400);

      expect(res.body.code).toBe('WEAK_PASSWORD');

      // Cleanup if somehow created
      await prisma.user.deleteMany({
        where: { email: 'weak-password@test.com' }
      }).catch(() => {});
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'email_user',
          password: 'ValidPass123!',
          role: 'buyer',
        })
        .expect(400);

      expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUsers.buyer.email, // Existing email
          username: 'different_user',
          password: 'ValidPass123!',
          role: 'buyer',
        })
        .expect(409);

      expect(res.body.code).toBe('USER_EXISTS');
    });

    it('should reject registration with invalid role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-role@test.com',
          username: 'invalid_role_user',
          password: 'ValidPass123!',
          role: 'superuser', // Invalid role
        })
        .expect(400);

      expect(res.body.code).toBe('INVALID_ROLE');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: 'invalid-role@test.com' }
      }).catch(() => {});
    });

    it('should reject seller registration with invalid niche', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-niche@test.com',
          username: 'invalid_niche_user',
          password: 'ValidPass123!',
          role: 'seller',
          sellerNiche: 'InvalidNiche', // Not in approved list
        })
        .expect(400);

      expect(res.body.code).toBe('INVALID_NICHE');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: 'invalid-niche@test.com' }
      }).catch(() => {});
    });
  });
});

