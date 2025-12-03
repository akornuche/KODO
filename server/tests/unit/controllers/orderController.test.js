// Mock Stripe BEFORE any imports
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret_abc',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      }),
    },
  }));
});

jest.mock('../../../src/lib/prisma', () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  delivery: {
    create: jest.fn(),
  },
  escrow: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/lib/socket', () => ({
  emitToUser: jest.fn(),
  broadcastOrderUpdate: jest.fn(),
}));

const orderController = require('../../../src/controllers/orderController');
const prisma = require('../../../src/lib/prisma');

describe('Order Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { userId: 'buyer123', role: 'buyer' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getUserOrders', () => {
    const mockOrders = [
      {
        id: '1',
        buyerId: 'buyer123',
        sellerId: 'seller456',
        totalAmount: 100,
        status: 'pending',
      },
      {
        id: '2',
        buyerId: 'buyer123',
        sellerId: 'seller789',
        totalAmount: 200,
        status: 'paid',
      },
    ];

    it('should get buyer\'s orders', async () => {
      req.user.id = 'buyer123'; // Fix: use id not userId
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(2);

      await orderController.getUserOrders(req, res);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerId: 'buyer123' },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orders: mockOrders,
          pagination: expect.any(Object),
        })
      );
    });

    it('should get seller\'s sales when type=sales', async () => {
      req.query.type = 'sales';
      req.user.role = 'seller';
      req.user.id = 'seller456'; // Fix: use id not userId
      prisma.order.findMany.mockResolvedValue([mockOrders[0]]);
      prisma.order.count.mockResolvedValue(1);

      await orderController.getUserOrders(req, res);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { product: { sellerId: 'seller456' } },
        })
      );
    });

    it('should filter orders by status', async () => {
      req.query.status = 'paid';
      req.user.id = 'buyer123'; // Fix: use id not userId
      prisma.order.findMany.mockResolvedValue([mockOrders[1]]);
      prisma.order.count.mockResolvedValue(1);

      await orderController.getUserOrders(req, res);

      const whereClause = prisma.order.findMany.mock.calls[0][0].where;
      expect(whereClause.status).toBe('paid');
    });

    it('should handle pagination', async () => {
      req.query.page = '2';
      req.query.limit = '5';
      req.user.id = 'buyer123'; // Fix: use id not userId
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(10);

      await orderController.getUserOrders(req, res);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should handle database errors', async () => {
      req.user.id = 'buyer123'; // Fix: use id not userId
      prisma.order.findMany.mockRejectedValue(new Error('Database error'));

      await orderController.getUserOrders(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.any(String),
        })
      );
    });
  });

  describe('getOrderById', () => {
    const mockOrder = {
      id: '123',
      buyerId: 'buyer123',
      sellerId: 'seller456',
      totalAmount: 100,
      status: 'pending',
      product: {
        id: 'prod1',
        title: 'Product',
        sellerId: 'seller456', // Add this for seller authorization check
      },
    };

    beforeEach(() => {
      req.params.id = '123';
    });

    it('should get order as buyer', async () => {
      req.user.id = 'buyer123'; // Fix: use id not userId
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.getOrderById(req, res);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          order: mockOrder,
        })
      );
    });

    it('should get order as seller', async () => {
      req.user = { id: 'seller456', role: 'seller' }; // Fix: use id not userId
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.getOrderById(req, res);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          order: mockOrder,
        })
      );
    });

    it('should fail for unauthorized user', async () => {
      req.user.id = 'otherUser'; // Fix: use id not userId
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.getOrderById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('permission'),
        })
      );
    });

    it('should return 404 for non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await orderController.getOrderById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('not found'),
        })
      );
    });
  });

  describe('payOrder', () => {
    const mockOrder = {
      id: '123',
      buyerId: 'buyer123',
      sellerId: 'seller456',
      totalAmount: 105,
      status: 'pending',
      product: {
        id: 'prod1',
        title: 'Product',
        seller: {
          id: 'seller456',
          email: 'seller@example.com',
        },
      },
      buyer: {
        id: 'buyer123',
        email: 'buyer@example.com',
      },
      escrow: null,
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = { paymentMethodId: 'pm_test' };
    });

    it('should pay for order successfully', async () => {
      req.user.id = 'buyer123';
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.escrow.create.mockResolvedValue({ id: 'escrow123', amount: 105 });
      prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'paid', escrowId: 'escrow123' });

      await orderController.payOrder(req, res);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment successful',
          order: expect.objectContaining({ status: 'paid' }),
        })
      );
    });

    it('should fail if order not found', async () => {
      req.user.id = 'buyer123';
      prisma.order.findUnique.mockResolvedValue(null);

      await orderController.payOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should fail if user is not buyer', async () => {
      req.user.id = 'otherUser';
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.payOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('buyer can pay'),
        })
      );
    });

    it('should fail if order already paid', async () => {
      req.user.id = 'buyer123';
      const paidOrder = { ...mockOrder, escrow: { id: 'escrow123' } };
      prisma.order.findUnique.mockResolvedValue(paidOrder);

      await orderController.payOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('already paid'),
        })
      );
    });

    it('should fail if order status is not pending', async () => {
      req.user.id = 'buyer123';
      const shippedOrder = { ...mockOrder, status: 'shipped' };
      prisma.order.findUnique.mockResolvedValue(shippedOrder);

      await orderController.payOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('Cannot pay'),
        })
      );
    });
  });

  describe('updateOrderStatus', () => {
    const mockOrder = {
      id: '123',
      buyerId: 'buyer123',
      sellerId: 'seller456',
      status: 'pending',
      product: {
        sellerId: 'seller456',
      },
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = { status: 'shipped' };
    });

    it('should update order status as seller', async () => {
      req.user = { id: 'seller456', role: 'seller' };
      const updatedOrder = {
        ...mockOrder,
        status: 'shipped',
        buyer: { select: { id: true, username: true, email: true } },
        product: { include: { seller: { select: { id: true, username: true, email: true } } } },
        escrow: true,
        delivery: { include: { courier: { select: { id: true, username: true, email: true } } } },
      };
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue(updatedOrder);

      await orderController.updateOrderStatus(req, res);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { status: 'shipped' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Order status updated successfully',
          order: expect.objectContaining({ status: 'shipped' }),
        })
      );
    });

    it('should fail for unauthorized user', async () => {
      req.user.id = 'otherUser'; // Fix: use id not userId
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.updateOrderStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('permission'),
        })
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should fail for invalid status', async () => {
      req.body.status = 'invalid_status';
      req.user.id = 'buyer123'; // buyer can set status to pending
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await orderController.updateOrderStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('Invalid status'),
        })
      );
    });

    it('should return 404 for non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await orderController.updateOrderStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('not found'),
        })
      );
    });
  });
});
