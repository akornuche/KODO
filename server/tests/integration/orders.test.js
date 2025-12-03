const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  createTestProduct,
  createTestBid,
  createTestOrder,
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Orders API', () => {
  let buyer, seller, courier;
  let buyerToken, sellerToken, courierToken;
  let product, bid, order;

  beforeAll(async () => {
    // Create test users
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

    courier = await createTestUser({ 
      role: 'courier', 
      username: 'courier1', 
      email: 'courier@test.com' 
    });
    courierToken = generateToken(courier.id, courier.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    // Clean orders and related data
    await prisma.delivery.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.product.deleteMany({});

    // Create fresh test data
    product = await createTestProduct(seller.id, { price: 100.00 });
    bid = await createTestBid(product.id, buyer.id, { 
      budget: 90.00,
      status: 'accepted'
    });
  });

  describe('POST /api/orders', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        productId: product.id,
        offeredPrice: 95.00,
        deliveryAddress: '123 Test Street'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toHaveProperty('id');
      expect(response.body.data.order.buyerId).toBe(buyer.id);
      expect(response.body.data.order.sellerId).toBe(seller.id);
      expect(response.body.data.order.status).toBe('pending');
    });

    it('should fail to create order for non-existent product', async () => {
      const orderData = {
        productId: '00000000-0000-0000-0000-000000000000',
        offeredPrice: 95.00
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create order without authentication', async () => {
      const orderData = {
        productId: product.id,
        offeredPrice: 95.00
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // Create test orders
      order = await createTestOrder(product.id, buyer.id, seller.id);
    });

    it('should get buyer\'s orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
      expect(response.body.data.orders[0].buyerId).toBe(buyer.id);
    });

    it('should get seller\'s sales', async () => {
      const response = await request(app)
        .get('/api/orders?type=sales')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.orders)).toBe(true);
      expect(response.body.data.orders[0].sellerId).toBe(seller.id);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.orders.forEach(order => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('GET /api/orders/:id', () => {
    beforeEach(async () => {
      order = await createTestOrder(product.id, buyer.id, seller.id);
    });

    it('should get order details as buyer', async () => {
      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe(order.id);
      expect(response.body.data.order).toHaveProperty('product');
      expect(response.body.data.order).toHaveProperty('buyer');
      expect(response.body.data.order).toHaveProperty('seller');
    });

    it('should get order details as seller', async () => {
      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe(order.id);
    });

    it('should fail to access another user\'s order', async () => {
      const anotherBuyer = await createTestUser({ 
        role: 'buyer', 
        username: 'buyer2', 
        email: 'buyer2@test.com' 
      });
      const anotherToken = generateToken(anotherBuyer.id, anotherBuyer.role);

      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    beforeEach(async () => {
      order = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'paid'
      });
    });

    it('should allow seller to mark order as shipped', async () => {
      const response = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'shipped' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('shipped');
    });

    it('should allow buyer to confirm delivery', async () => {
      // First ship the order
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'shipped' }
      });

      const response = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('delivered');
    });

    it('should fail with invalid status transition', async () => {
      const response = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'delivered' }) // Can't skip from paid to delivered
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail when unauthorized user tries to update', async () => {
      const anotherUser = await createTestUser({ 
        role: 'buyer', 
        username: 'buyer2', 
        email: 'buyer2@test.com' 
      });
      const anotherToken = generateToken(anotherUser.id, anotherUser.role);

      const response = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ status: 'shipped' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/orders/:id/dispute', () => {
    beforeEach(async () => {
      order = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'delivered'
      });
    });

    it('should create a dispute successfully', async () => {
      const disputeData = {
        reason: 'item_not_as_described',
        description: 'The product does not match the description'
      };

      const response = await request(app)
        .post(`/api/orders/${order.id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(disputeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dispute).toHaveProperty('id');
      expect(response.body.data.dispute.orderId).toBe(order.id);
      expect(response.body.data.dispute.reason).toBe(disputeData.reason);
      expect(response.body.data.dispute.status).toBe('pending');
    });

    it('should fail to create duplicate dispute', async () => {
      // Create first dispute
      await prisma.dispute.create({
        data: {
          orderId: order.id,
          filedBy: buyer.id,
          reason: 'item_not_as_described',
          description: 'Test',
          status: 'pending'
        }
      });

      const disputeData = {
        reason: 'damaged_item',
        description: 'Another issue'
      };

      const response = await request(app)
        .post(`/api/orders/${order.id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(disputeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to dispute order before delivery', async () => {
      const pendingOrder = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'pending'
      });

      const disputeData = {
        reason: 'item_not_as_described',
        description: 'Test'
      };

      const response = await request(app)
        .post(`/api/orders/${pendingOrder.id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(disputeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
