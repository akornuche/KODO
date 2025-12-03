const request = require('supertest');
const { app } = require('../../app');
const { 
  generateToken, 
  createTestUser, 
  createTestProduct,
  createTestOrder,
  createTestDelivery,
  cleanupTestData,
  disconnectPrisma,
  prisma
} = require('../helpers/testUtils');

describe('Deliveries API', () => {
  let buyer, seller, courier, anotherCourier;
  let buyerToken, sellerToken, courierToken, anotherCourierToken;
  let product, order, delivery;

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

    courier = await createTestUser({ 
      role: 'courier', 
      username: 'courier1', 
      email: 'courier@test.com' 
    });
    courierToken = generateToken(courier.id, courier.role);

    anotherCourier = await createTestUser({ 
      role: 'courier', 
      username: 'courier2', 
      email: 'courier2@test.com' 
    });
    anotherCourierToken = generateToken(anotherCourier.id, anotherCourier.role);
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  beforeEach(async () => {
    await prisma.delivery.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});

    product = await createTestProduct(seller.id);
    order = await createTestOrder(product.id, buyer.id, seller.id, {
      status: 'paid'
    });
  });

  describe('GET /api/deliveries/available', () => {
    beforeEach(async () => {
      await createTestDelivery(order.id, { status: 'pending' });
      
      const anotherProduct = await createTestProduct(seller.id);
      const anotherOrder = await createTestOrder(anotherProduct.id, buyer.id, seller.id);
      await createTestDelivery(anotherOrder.id, { 
        status: 'assigned',
        courierId: courier.id 
      });
    });

    it('should get available deliveries as courier', async () => {
      const response = await request(app)
        .get('/api/deliveries/available')
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.deliveries)).toBe(true);
      expect(response.body.data.deliveries.length).toBeGreaterThan(0);
      
      // Should only show pending deliveries
      response.body.data.deliveries.forEach(delivery => {
        expect(delivery.status).toBe('pending');
      });
    });

    it('should fail as non-courier', async () => {
      const response = await request(app)
        .get('/api/deliveries/available')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter by location', async () => {
      await prisma.delivery.updateMany({
        where: { status: 'pending' },
        data: { pickupLocation: 'Lagos, Nigeria' }
      });

      const response = await request(app)
        .get('/api/deliveries/available?location=Lagos')
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/deliveries/my-deliveries', () => {
    beforeEach(async () => {
      delivery = await createTestDelivery(order.id, {
        courierId: courier.id,
        status: 'assigned'
      });
    });

    it('should get courier\'s assigned deliveries', async () => {
      const response = await request(app)
        .get('/api/deliveries/my-deliveries')
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.deliveries)).toBe(true);
      expect(response.body.data.deliveries.length).toBe(1);
      expect(response.body.data.deliveries[0].courierId).toBe(courier.id);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/deliveries/my-deliveries?status=assigned')
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.deliveries.forEach(delivery => {
        expect(delivery.status).toBe('assigned');
      });
    });
  });

  describe('GET /api/deliveries/:id', () => {
    beforeEach(async () => {
      delivery = await createTestDelivery(order.id, {
        courierId: courier.id,
        status: 'assigned'
      });
    });

    it('should get delivery details as courier', async () => {
      const response = await request(app)
        .get(`/api/deliveries/${delivery.id}`)
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.id).toBe(delivery.id);
      expect(response.body.data.delivery).toHaveProperty('order');
    });

    it('should get delivery details as buyer', async () => {
      const response = await request(app)
        .get(`/api/deliveries/${delivery.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.id).toBe(delivery.id);
    });

    it('should get delivery details as seller', async () => {
      const response = await request(app)
        .get(`/api/deliveries/${delivery.id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail for unauthorized user', async () => {
      const anotherBuyer = await createTestUser({ 
        role: 'buyer', 
        username: 'buyer2', 
        email: 'buyer2@test.com' 
      });
      const anotherBuyerToken = generateToken(anotherBuyer.id, anotherBuyer.role);

      const response = await request(app)
        .get(`/api/deliveries/${delivery.id}`)
        .set('Authorization', `Bearer ${anotherBuyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/deliveries/:id/accept', () => {
    beforeEach(async () => {
      delivery = await createTestDelivery(order.id, { status: 'pending' });
    });

    it('should accept delivery as courier', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${delivery.id}/accept`)
        .set('Authorization', `Bearer ${courierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.courierId).toBe(courier.id);
      expect(response.body.data.delivery.status).toBe('assigned');
    });

    it('should fail if already assigned', async () => {
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: { 
          courierId: courier.id,
          status: 'assigned'
        }
      });

      const response = await request(app)
        .post(`/api/deliveries/${delivery.id}/accept`)
        .set('Authorization', `Bearer ${anotherCourierToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail as non-courier', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${delivery.id}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/deliveries/:id/status', () => {
    beforeEach(async () => {
      delivery = await createTestDelivery(order.id, {
        courierId: courier.id,
        status: 'assigned'
      });
    });

    it('should update delivery status as assigned courier', async () => {
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ status: 'picked_up' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.status).toBe('picked_up');
    });

    it('should complete delivery workflow', async () => {
      // Picked up
      await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ status: 'picked_up' })
        .expect(200);

      // In transit
      await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ status: 'in_transit' })
        .expect(200);

      // Delivered
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.status).toBe('delivered');
    });

    it('should fail with invalid status transition', async () => {
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ status: 'delivered' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for wrong courier', async () => {
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/status`)
        .set('Authorization', `Bearer ${anotherCourierToken}`)
        .send({ status: 'picked_up' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/deliveries/:id/location', () => {
    beforeEach(async () => {
      delivery = await createTestDelivery(order.id, {
        courierId: courier.id,
        status: 'in_transit'
      });
    });

    it('should update delivery location', async () => {
      const locationData = {
        latitude: 6.5244,
        longitude: 3.3792
      };

      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/location`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send(locationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.currentLatitude).toBe(locationData.latitude);
      expect(response.body.data.delivery.currentLongitude).toBe(locationData.longitude);
    });

    it('should fail with invalid coordinates', async () => {
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/location`)
        .set('Authorization', `Bearer ${courierToken}`)
        .send({ latitude: 'invalid', longitude: 3.3792 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-assigned courier', async () => {
      const response = await request(app)
        .patch(`/api/deliveries/${delivery.id}/location`)
        .set('Authorization', `Bearer ${anotherCourierToken}`)
        .send({ latitude: 6.5244, longitude: 3.3792 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
