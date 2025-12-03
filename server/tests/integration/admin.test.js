const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  createTestProduct,
  createTestOrder,
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Admin API', () => {
  let admin, buyer, seller;
  let adminToken, buyerToken, sellerToken;
  let product, order;

  beforeAll(async () => {
    admin = await createTestUser({ 
      role: 'admin', 
      username: 'admin1', 
      email: 'admin@test.com' 
    });
    adminToken = generateToken(admin.id, admin.role);
    
    buyer = await createTestUser({ 
      role: 'buyer', 
      username: 'buyer1', 
      email: 'buyer@test.com' 
    });
    buyerToken = generateToken(buyer.id, buyer.role);
    
    seller = await createTestUser({ 
      role: 'seller', 
      username: 'seller1', 
      email: 'seller@test.com' 
    });
    sellerToken = generateToken(seller.id, seller.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await prisma.dispute.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});
  });

  describe('GET /api/admin/stats', () => {
    it('should get platform statistics as admin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('totalUsers');
      expect(response.body.data.stats).toHaveProperty('activeProducts');
      expect(response.body.data.stats).toHaveProperty('totalOrders');
      expect(response.body.data.stats).toHaveProperty('totalRevenue');
    });

    it('should fail for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=buyer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.users.forEach(user => {
        expect(user.role).toBe('buyer');
      });
    });

    it('should search users', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=buyer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get user details as admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${buyer.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(buyer.id);
      expect(response.body.data.user).toHaveProperty('email');
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${seller.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role as admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${buyer.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'seller' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('seller');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${buyer.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${buyer.id}/role`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user as admin', async () => {
      const testUser = await createTestUser({ 
        username: 'deletetest', 
        email: 'delete@test.com' 
      });

      const response = await request(app)
        .delete(`/api/admin/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(user).toBeNull();
    });

    it('should fail to delete admin user', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${buyer.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/products', () => {
    beforeEach(async () => {
      await createTestProduct(seller.id, { status: 'active' });
      await createTestProduct(seller.id, { status: 'sold' });
    });

    it('should get all products as admin', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/admin/products?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.products.forEach(product => {
        expect(product.status).toBe('active');
      });
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/products/:id', () => {
    beforeEach(async () => {
      product = await createTestProduct(seller.id);
    });

    it('should delete product as admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deletedProduct = await prisma.product.findUnique({
        where: { id: product.id }
      });
      expect(deletedProduct).toBeNull();
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .delete(`/api/admin/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/disputes', () => {
    beforeEach(async () => {
      product = await createTestProduct(seller.id);
      order = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'delivered'
      });

      await prisma.dispute.create({
        data: {
          orderId: order.id,
          filedBy: buyer.id,
          reason: 'item_not_as_described',
          description: 'Test dispute',
          status: 'pending'
        }
      });
    });

    it('should get all disputes as admin', async () => {
      const response = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.disputes)).toBe(true);
      expect(response.body.data.disputes.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/admin/disputes?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.disputes.forEach(dispute => {
        expect(dispute.status).toBe('pending');
      });
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/disputes/:id/resolve', () => {
    let dispute;

    beforeEach(async () => {
      product = await createTestProduct(seller.id);
      order = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'delivered'
      });

      dispute = await prisma.dispute.create({
        data: {
          orderId: order.id,
          filedBy: buyer.id,
          reason: 'item_not_as_described',
          description: 'Test dispute',
          status: 'pending'
        }
      });
    });

    it('should resolve dispute as admin', async () => {
      const resolutionData = {
        resolution: 'refund_buyer',
        adminNotes: 'Refund approved'
      };

      const response = await request(app)
        .patch(`/api/admin/disputes/${dispute.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resolutionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dispute.status).toBe('resolved');
      expect(response.body.data.dispute.resolution).toBe(resolutionData.resolution);
    });

    it('should fail with invalid resolution', async () => {
      const response = await request(app)
        .patch(`/api/admin/disputes/${dispute.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-admin', async () => {
      const response = await request(app)
        .patch(`/api/admin/disputes/${dispute.id}/resolve`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ resolution: 'refund_buyer' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
