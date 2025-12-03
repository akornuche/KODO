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

describe('Reviews API', () => {
  let buyer, seller, anotherBuyer;
  let buyerToken, sellerToken, anotherBuyerToken;
  let product, order;

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
    await prisma.review.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});

    product = await createTestProduct(seller.id);
    order = await createTestOrder(product.id, buyer.id, seller.id, {
      status: 'delivered'
    });
  });

  describe('POST /api/reviews', () => {
    it('should create a review for delivered order', async () => {
      const reviewData = {
        orderId: order.id,
        rating: 5,
        comment: 'Excellent product and service!'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toHaveProperty('id');
      expect(response.body.data.review.rating).toBe(reviewData.rating);
      expect(response.body.data.review.comment).toBe(reviewData.comment);
      expect(response.body.data.review.reviewerId).toBe(buyer.id);
      expect(response.body.data.review.revieweeId).toBe(seller.id);
    });

    it('should fail with invalid rating', async () => {
      const reviewData = {
        orderId: order.id,
        rating: 6, // Invalid: must be 1-5
        comment: 'Test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to review undelivered order', async () => {
      const pendingOrder = await createTestOrder(product.id, buyer.id, seller.id, {
        status: 'pending'
      });

      const reviewData = {
        orderId: pendingOrder.id,
        rating: 5,
        comment: 'Test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create duplicate review', async () => {
      await prisma.review.create({
        data: {
          orderId: order.id,
          productId: product.id,
          reviewerId: buyer.id,
          revieweeId: seller.id,
          rating: 5,
          comment: 'First review'
        }
      });

      const reviewData = {
        orderId: order.id,
        rating: 4,
        comment: 'Duplicate attempt'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail to review own order', async () => {
      const reviewData = {
        orderId: order.id,
        rating: 5,
        comment: 'Test'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(reviewData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/product/:productId', () => {
    beforeEach(async () => {
      // Create multiple reviews for the product
      const order2 = await createTestOrder(product.id, anotherBuyer.id, seller.id, {
        status: 'delivered'
      });

      await prisma.review.createMany({
        data: [
          {
            orderId: order.id,
            productId: product.id,
            reviewerId: buyer.id,
            revieweeId: seller.id,
            rating: 5,
            comment: 'Great product!'
          },
          {
            orderId: order2.id,
            productId: product.id,
            reviewerId: anotherBuyer.id,
            revieweeId: seller.id,
            rating: 4,
            comment: 'Good product'
          }
        ]
      });
    });

    it('should get all reviews for a product', async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${product.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
      expect(response.body.data.reviews.length).toBe(2);
      expect(response.body.data).toHaveProperty('averageRating');
      expect(response.body.data.averageRating).toBe(4.5);
    });

    it('should return empty array for product with no reviews', async () => {
      const newProduct = await createTestProduct(seller.id);

      const response = await request(app)
        .get(`/api/reviews/product/${newProduct.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews.length).toBe(0);
      expect(response.body.data.averageRating).toBe(0);
    });
  });

  describe('GET /api/reviews/user/:userId', () => {
    beforeEach(async () => {
      await prisma.review.create({
        data: {
          orderId: order.id,
          productId: product.id,
          reviewerId: buyer.id,
          revieweeId: seller.id,
          rating: 5,
          comment: 'Excellent seller!'
        }
      });
    });

    it('should get reviews for a user', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${seller.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
      expect(response.body.data.reviews.length).toBe(1);
      expect(response.body.data).toHaveProperty('averageRating');
      expect(response.body.data.averageRating).toBe(5);
    });

    it('should filter by rating', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${seller.id}?minRating=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.reviews.forEach(review => {
        expect(review.rating).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('PUT /api/reviews/:id', () => {
    let review;

    beforeEach(async () => {
      review = await prisma.review.create({
        data: {
          orderId: order.id,
          productId: product.id,
          reviewerId: buyer.id,
          revieweeId: seller.id,
          rating: 4,
          comment: 'Original comment'
        }
      });
    });

    it('should update own review', async () => {
      const updateData = {
        rating: 5,
        comment: 'Updated comment - even better!'
      };

      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review.rating).toBe(updateData.rating);
      expect(response.body.data.review.comment).toBe(updateData.comment);
    });

    it('should fail to update another user\'s review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .send({ rating: 1, comment: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid rating', async () => {
      const response = await request(app)
        .put(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 0, comment: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    let review;

    beforeEach(async () => {
      review = await prisma.review.create({
        data: {
          orderId: order.id,
          productId: product.id,
          reviewerId: buyer.id,
          revieweeId: seller.id,
          rating: 5,
          comment: 'Test review'
        }
      });
    });

    it('should delete own review', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const checkResponse = await request(app)
        .get(`/api/reviews/product/${product.id}`)
        .expect(200);

      expect(checkResponse.body.data.reviews.length).toBe(0);
    });

    it('should fail to delete another user\'s review', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
