const prisma = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  delivery: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/lib/socket', () => ({
  emitToUser: jest.fn(),
  broadcastDeliveryUpdate: jest.fn(),
  notifyAvailableDelivery: jest.fn(),
}));

jest.mock('../../../src/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
  templates: {
    deliveryAssigned: jest.fn().mockReturnValue({ subject: 'assigned', html: '<p>x</p>' }),
    deliveryUpdate: jest.fn().mockReturnValue({ subject: 'update', html: '<p>x</p>' }),
    orderCompleted: jest.fn().mockReturnValue({ subject: 'completed', html: '<p>x</p>' }),
  },
}));

const deliveryController = require('../../../src/controllers/deliveryController');

describe('Delivery Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'courier123', role: 'courier' }, // Fix: use id not userId
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getAvailableDeliveries', () => {
    const mockDeliveries = [
      {
        id: '1',
        orderId: 'order1',
        status: 'pending',
        pickupLocation: 'Location A',
        deliveryLocation: 'Location B',
      },
      {
        id: '2',
        orderId: 'order2',
        status: 'pending',
        pickupLocation: 'Location C',
        deliveryLocation: 'Location D',
      },
    ];

    it('should get available deliveries for courier', async () => {
      prisma.delivery.findMany.mockResolvedValue(mockDeliveries);
      prisma.delivery.count.mockResolvedValue(2);

      await deliveryController.getAvailableDeliveries(req, res);

      expect(prisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        deliveries: mockDeliveries,
        appliedFilters: {
          location: null,
          search: null,
          geoLocation: null,
        },
        meta: expect.any(Object),
      });
    });

    it('should handle pagination', async () => {
      req.query.page = '2';
      req.query.limit = '10';
      prisma.delivery.findMany.mockResolvedValue(mockDeliveries);
      prisma.delivery.count.mockResolvedValue(20);

      await deliveryController.getAvailableDeliveries(req, res);

      expect(prisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should filter by location', async () => {
      req.query.location = 'New York';
      prisma.delivery.findMany.mockResolvedValue([mockDeliveries[0]]);
      prisma.delivery.count.mockResolvedValue(1);

      await deliveryController.getAvailableDeliveries(req, res);

      const whereClause = prisma.delivery.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toBeDefined();
    });

    it('should handle database errors', async () => {
      prisma.delivery.findMany.mockRejectedValue(new Error('Database error'));

      await deliveryController.getAvailableDeliveries(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCourierDeliveries', () => {
    const mockDeliveries = [
      {
        id: '1',
        orderId: 'order1',
        courierId: 'courier123',
        status: 'in_transit',
      },
    ];

    it('should get courier\'s assigned deliveries', async () => {
      prisma.delivery.findMany.mockResolvedValue(mockDeliveries);
      prisma.delivery.count.mockResolvedValue(1);

      await deliveryController.getCourierDeliveries(req, res);

      expect(prisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            courierId: 'courier123',
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        deliveries: mockDeliveries,
      });
    });

    it('should filter by status', async () => {
  req.query.status = 'in_transit';
      prisma.delivery.findMany.mockResolvedValue([]);
      prisma.delivery.count.mockResolvedValue(0);

      await deliveryController.getCourierDeliveries(req, res);

  const whereClause = prisma.delivery.findMany.mock.calls[0][0].where;
  expect(whereClause.status).toBe('in_transit');
    });

    it('should sort by created date descending', async () => {
      prisma.delivery.findMany.mockResolvedValue(mockDeliveries);
      prisma.delivery.count.mockResolvedValue(1);

      await deliveryController.getCourierDeliveries(req, res);

      expect(prisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getDeliveryById', () => {
    const mockDelivery = {
      id: '123',
      orderId: 'order1',
      courierId: 'courier123',
      status: 'in_transit',
      order: {
        id: 'order1',
        buyerId: 'buyer1',
        product: {
          sellerId: 'seller1',
        },
      },
    };

    beforeEach(() => {
      req.params.id = '123';
    });

    it('should get delivery as assigned courier', async () => {
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.getDeliveryById(req, res);

      expect(prisma.delivery.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        delivery: mockDelivery,
      });
    });

    it('should get delivery as buyer', async () => {
      req.user = { id: 'buyer1', role: 'buyer' };
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.getDeliveryById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        delivery: mockDelivery,
      });
    });

    it('should get delivery as seller', async () => {
      req.user = { id: 'seller1', role: 'seller' };
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.getDeliveryById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        delivery: mockDelivery,
      });
    });

    it('should fail for unauthorized user', async () => {
      req.user = { id: 'otherUser', role: 'courier' };
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.getDeliveryById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'You do not have permission to view this delivery',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    });

    it('should return 404 for non-existent delivery', async () => {
      prisma.delivery.findUnique.mockResolvedValue(null);

      await deliveryController.getDeliveryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    });
  });

  describe('acceptDelivery', () => {
    const mockDelivery = {
      id: '123',
      orderId: 'order1',
      status: 'pending',
      courierId: null,
      order: {
        buyerId: 'buyer1',
        buyer: { email: 'buyer@example.com' },
        product: { sellerId: 'seller1', seller: { email: 'seller@example.com' } },
      },
    };

    beforeEach(() => {
      req.params.id = '123';
    });

    it('should accept delivery successfully', async () => {
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      prisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier123',
        status: 'assigned',
      });

      await deliveryController.acceptDelivery(req, res);

      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          courierId: 'courier123',
          status: 'assigned',
          acceptedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Delivery accepted successfully',
        delivery: {
          ...mockDelivery,
          courierId: 'courier123',
          status: 'assigned',
        },
      });
    });

    it('should fail if delivery already assigned', async () => {
      mockDelivery.courierId = 'otherCourier';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.acceptDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'This delivery is no longer available',
        code: 'DELIVERY_UNAVAILABLE',
        requestId: req.id,
      });
      expect(prisma.delivery.update).not.toHaveBeenCalled();
    });

    it('should fail if delivery not pending', async () => {
      mockDelivery.status = 'completed';
      mockDelivery.courierId = null;
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.acceptDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'This delivery is no longer available',
        code: 'DELIVERY_UNAVAILABLE',
        requestId: req.id,
      });
    });

    it('should return 404 for non-existent delivery', async () => {
      prisma.delivery.findUnique.mockResolvedValue(null);

      await deliveryController.acceptDelivery(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    });
  });

  describe('updateDeliveryStatus', () => {
    const mockDelivery = {
      id: '123',
      orderId: 'order1',
      courierId: 'courier123',
      status: 'accepted',
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = { status: 'in_transit' };
    });

    it('should update delivery status', async () => {
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      prisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        status: 'in_transit',
      });

      await deliveryController.updateDeliveryStatus(req, res);

      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { status: 'in_transit' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Delivery status updated successfully',
        delivery: {
          ...mockDelivery,
          status: 'in_transit',
        },
      });
    });

    it('should fail for unauthorized courier', async () => {
      req.user.id = 'otherCourier';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Only the assigned courier or admin can update delivery status',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
      expect(prisma.delivery.update).not.toHaveBeenCalled();
    });

    it('should validate status', async () => {
      req.body.status = 'invalid_status';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.updateDeliveryStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: `Invalid status. Must be one of: pending, assigned, in_transit, delivered, failed`,
        code: 'INVALID_STATUS',
        requestId: req.id,
      });
    });

    it('should update order status when delivered', async () => {
      req.body.status = 'delivered';
      mockDelivery.status = 'in_transit';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      prisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        status: 'delivered',
      });
      prisma.order.update.mockResolvedValue({});

      await deliveryController.updateDeliveryStatus(req, res);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order1' },
        data: { status: 'completed' },
      });
    });
  });

  describe('updateDeliveryLocation', () => {
    const mockDelivery = {
      id: '123',
      orderId: 'order1',
      courierId: 'courier123',
      status: 'in_transit',
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = {
        latitude: 40.7128,
        longitude: -74.0060,
      };
    });

    it('should update delivery location', async () => {
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      prisma.delivery.update.mockResolvedValue({
        ...mockDelivery,
        currentLatitude: 40.7128,
        currentLongitude: -74.0060,
      });

      await deliveryController.updateDeliveryLocation(req, res);

      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          currentLatitude: 40.7128,
          currentLongitude: -74.0060,
          lastLocationUpdate: expect.any(Date),
        },
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should fail for unauthorized courier', async () => {
  req.user.id = 'otherCourier';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.updateDeliveryLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should fail if delivery not active', async () => {
      mockDelivery.status = 'completed';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.updateDeliveryLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Cannot update location for inactive delivery',
        code: 'INVALID_DELIVERY_STATE',
        requestId: req.id,
      });
    });

    it('should validate latitude and longitude', async () => {
      req.body.latitude = 'invalid';
      req.body.longitude = 'invalid';
      prisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await deliveryController.updateDeliveryLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid coordinates. Lat and lng must be numbers',
        code: 'INVALID_COORDINATES',
        requestId: req.id,
      });
    });
  });
});
