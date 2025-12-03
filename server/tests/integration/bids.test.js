const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  createTestProduct,
  createTestBid,
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Bids API', () => {
  let buyer, seller, anotherBuyer;
  let buyerToken, sellerToken, anotherBuyerToken;
  let product, bid;

  beforeAll(async () => {
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

    anotherBuyer = await createTestUser({ 
      role: 'buyer', 
      username: 'buyer2', 
      email: 'buyer2@test.com' 
    });
    anotherBuyerToken = generateToken(anotherBuyer.id, anotherBuyer.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await prisma.bid.deleteMany({});
    await prisma.product.deleteMany({});
    product = await createTestProduct(seller.id, { price: 100.00 });
  });

  describe('POST /api/requests', () => {
    it('should create a bid as buyer', async () => {
      const bidData = {
        productId: product.id,
        budget: 90.00,
        description: 'Interested in this product'
      };

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(bidData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bid).toHaveProperty('id');
      expect(response.body.data.bid.buyerId).toBe(buyer.id);
      expect(response.body.data.bid.productId).toBe(product.id);
      expect(response.body.data.bid.budget).toBe(bidData.budget);
      expect(response.body.data.bid.status).toBe('pending');
    });

    it('should fail to create bid as seller', async () => {
      const bidData = {
        productId: product.id,
        budget: 90.00,
        description: 'Test'
      };

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(bidData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid budget', async () => {
      const bidData = {
        productId: product.id,
        budget: -10.00,
        description: 'Test'
      };

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(bidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent product', async () => {
      const bidData = {
        productId: '00000000-0000-0000-0000-000000000000',
        budget: 90.00,
        description: 'Test'
      };

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(bidData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/requests/my-bids', () => {
    beforeEach(async () => {
      await createTestBid(product.id, buyer.id, { budget: 90.00 });
      await createTestBid(product.id, anotherBuyer.id, { budget: 85.00 });
    });

    it('should get buyer\'s own bids', async () => {
      const response = await request(app)
        .get('/api/requests/my-bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bids)).toBe(true);
      expect(response.body.data.bids.length).toBe(1);
      expect(response.body.data.bids[0].buyerId).toBe(buyer.id);
    });

    it('should filter bids by status', async () => {
      await prisma.bid.updateMany({
        where: { buyerId: buyer.id },
        data: { status: 'accepted' }
      });

      const response = await request(app)
        .get('/api/requests/my-bids?status=accepted')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.bids.forEach(bid => {
        expect(bid.status).toBe('accepted');
      });
    });
  });

  describe('GET /api/requests/received', () => {
    beforeEach(async () => {
      bid = await createTestBid(product.id, buyer.id);
    });

    it('should get bids received on seller\'s products', async () => {
      const response = await request(app)
        .get('/api/requests/received')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.bids)).toBe(true);
      expect(response.body.data.bids.length).toBeGreaterThan(0);
      expect(response.body.data.bids[0].product.sellerId).toBe(seller.id);
    });

    it('should fail as buyer', async () => {
      const response = await request(app)
        .get('/api/requests/received')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/requests/:id/offer', () => {
    beforeEach(async () => {
      bid = await createTestBid(product.id, buyer.id);
    });

    it('should submit offer as seller', async () => {
      const offerData = {
        offeredPrice: 95.00,
        message: 'Best I can do'
      };

      const response = await request(app)
        .post(`/api/requests/${bid.id}/offer`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(offerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bid.offeredPrice).toBe(offerData.offeredPrice);
      expect(response.body.data.bid.sellerMessage).toBe(offerData.message);
    });

    it('should fail as non-owner seller', async () => {
      const anotherSeller = await createTestUser({ 
        role: 'seller', 
        username: 'seller2', 
        email: 'seller2@test.com' 
      });
      const anotherSellerToken = generateToken(anotherSeller.id, anotherSeller.role);

      const response = await request(app)
        .post(`/api/requests/${bid.id}/offer`)
        .set('Authorization', `Bearer ${anotherSellerToken}`)
        .send({ offeredPrice: 95.00 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid price', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/offer`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ offeredPrice: -10.00 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/requests/:id/accept', () => {
    beforeEach(async () => {
      bid = await createTestBid(product.id, buyer.id, {
        offeredPrice: 95.00,
        sellerMessage: 'Counter offer'
      });
    });

    it('should accept offer as buyer', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bid.status).toBe('accepted');
    });

    it('should fail to accept own bid', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/accept`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail without seller offer', async () => {
      const newBid = await createTestBid(product.id, buyer.id, {
        offeredPrice: null
      });

      const response = await request(app)
        .post(`/api/requests/${newBid.id}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/requests/:id/reject', () => {
    beforeEach(async () => {
      bid = await createTestBid(product.id, buyer.id, {
        offeredPrice: 95.00
      });
    });

    it('should reject bid as buyer', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/reject`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bid.status).toBe('rejected');
    });

    it('should reject bid as seller', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bid.status).toBe('rejected');
    });

    it('should fail for unauthorized user', async () => {
      const response = await request(app)
        .post(`/api/requests/${bid.id}/reject`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/requests/:id', () => {
    beforeEach(async () => {
      bid = await createTestBid(product.id, buyer.id);
    });

    it('should delete own bid', async () => {
      const response = await request(app)
        .delete(`/api/requests/${bid.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const checkResponse = await request(app)
        .get('/api/requests/my-bids')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(checkResponse.body.data.bids.length).toBe(0);
    });

    it('should fail to delete another user\'s bid', async () => {
      const response = await request(app)
        .delete(`/api/requests/${bid.id}`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
