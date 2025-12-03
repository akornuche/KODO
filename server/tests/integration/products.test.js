const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  createTestProduct,
  cleanupTestData,
  disconnectPrisma 
} = require('../helpers/testUtils');

describe('Products API', () => {
  let seller;
  let sellerToken;
  let buyer;
  let buyerToken;

  beforeAll(async () => {
    // Create test users
    seller = await createTestUser({ role: 'seller', username: 'seller1', email: 'seller@test.com' });
    sellerToken = generateToken(seller.id, seller.role);
    
    buyer = await createTestUser({ role: 'buyer', username: 'buyer1', email: 'buyer@test.com' });
    buyerToken = generateToken(buyer.id, buyer.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    // Clean only products between tests
    const { prisma } = require('../helpers/testUtils');
    await prisma.product.deleteMany({});
  });

  describe('POST /api/products', () => {
    it('should create a product as seller', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        category: 'Electronics',
        condition: 'new',
        price: 100.00
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toHaveProperty('id');
      expect(response.body.data.product.title).toBe(productData.title);
      expect(response.body.data.product.sellerId).toBe(seller.id);
    });

    it('should fail to create product as buyer', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test Description',
        category: 'Electronics',
        condition: 'new',
        price: 100.00
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(productData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const productData = {
        title: 'Test Product'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products', () => {
    it('should get all active products', async () => {
      // Create test products
      await createTestProduct(seller.id, { status: 'active' });
      await createTestProduct(seller.id, { status: 'active' });
      await createTestProduct(seller.id, { status: 'sold' });

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThanOrEqual(2);
      
      // All products should be active
      response.body.data.products.forEach(product => {
        expect(product.status).toBe('active');
      });
    });

    it('should filter products by category', async () => {
      await createTestProduct(seller.id, { category: 'Electronics' });
      await createTestProduct(seller.id, { category: 'Clothing' });

      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.products.forEach(product => {
        expect(product.category).toBe('Electronics');
      });
    });

    it('should search products by title', async () => {
      await createTestProduct(seller.id, { title: 'iPhone 13' });
      await createTestProduct(seller.id, { title: 'Samsung Galaxy' });

      const response = await request(app)
        .get('/api/products?search=iPhone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products[0].title).toContain('iPhone');
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by id', async () => {
      const product = await createTestProduct(seller.id);

      const response = await request(app)
        .get(`/api/products/${product.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.id).toBe(product.id);
      expect(response.body.data.product.title).toBe(product.title);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update own product', async () => {
      const product = await createTestProduct(seller.id);
      const updateData = {
        title: 'Updated Title',
        price: 150.00
      };

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.title).toBe(updateData.title);
      expect(response.body.data.product.price).toBe(updateData.price);
    });

    it('should fail to update another user\'s product', async () => {
      const product = await createTestProduct(seller.id);
      const anotherSeller = await createTestUser({ 
        role: 'seller', 
        username: 'seller2', 
        email: 'seller2@test.com' 
      });
      const anotherToken = generateToken(anotherSeller.id, anotherSeller.role);

      const response = await request(app)
        .put(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ title: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete own product', async () => {
      const product = await createTestProduct(seller.id);

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is deleted
      const checkResponse = await request(app)
        .get(`/api/products/${product.id}`)
        .expect(404);
    });

    it('should fail to delete another user\'s product', async () => {
      const product = await createTestProduct(seller.id);
      const anotherSeller = await createTestUser({ 
        role: 'seller', 
        username: 'seller2', 
        email: 'seller2@test.com' 
      });
      const anotherToken = generateToken(anotherSeller.id, anotherSeller.role);

      const response = await request(app)
        .delete(`/api/products/${product.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
