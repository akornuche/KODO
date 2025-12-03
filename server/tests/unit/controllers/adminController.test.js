const adminController = require('../../../src/controllers/adminController');
const prisma = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  bid: {
    count: jest.fn().mockResolvedValue(0),
  },
  delivery: {
    count: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  review: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../../src/lib/email', () => ({
  sendEmail: jest.fn(),
}));

describe('Admin Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { userId: 'admin123', role: 'admin' },
      id: 'req123',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getPlatformStats', () => {
    it('should get platform statistics', async () => {
      // Set up all required mocks for getPlatformStats
      prisma.user.count.mockResolvedValue(100);
      prisma.user.groupBy.mockResolvedValue([
        { role: 'buyer', _count: 50 },
        { role: 'seller', _count: 30 },
      ]);
      prisma.product.count.mockResolvedValue(500);
      prisma.bid.count.mockResolvedValue(80);
      prisma.order.count.mockResolvedValue(250);
      prisma.order.groupBy.mockResolvedValue([
        { status: 'paid', _count: 100 },
        { status: 'completed', _count: 150 },
      ]);
      prisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 50000 },
      });
      prisma.delivery.count.mockResolvedValue(200);
      prisma.delivery.groupBy.mockResolvedValue([
        { status: 'delivered', _count: 150 },
        { status: 'pending', _count: 50 },
      ]);

      await adminController.getPlatformStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({
            overview: expect.objectContaining({
              totalUsers: 100,
              totalProducts: 500,
              totalOrders: 250,
            }),
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      const dbError = { message: 'Database error' };
      prisma.user.count.mockRejectedValue(dbError);

      await adminController.getPlatformStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.any(String),
        })
      );
    });
  });

  describe('getAllUsers', () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user1@example.com',
        username: 'user1',
        role: 'buyer',
        _count: { products: 0, orders: 5 },
      },
      {
        id: '2',
        email: 'user2@example.com',
        username: 'user2',
        role: 'seller',
        _count: { products: 10, orders: 20 },
      },
    ];

    it('should get all users with pagination', async () => {
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(2);

      await adminController.getAllUsers(req, res);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        analytics: null,
        appliedFilters: {
          role: null,
          search: null,
          dateRange: null,
          hasActivity: null,
        },
        meta: expect.any(Object),
      });
    });

    it('should filter by role', async () => {
      req.query.role = 'seller';
      prisma.user.findMany.mockResolvedValue([mockUsers[1]]);
      prisma.user.count.mockResolvedValue(1);

      await adminController.getAllUsers(req, res);

      const whereClause = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereClause.role).toBe('seller');
    });

    it('should search by username or email', async () => {
      req.query.search = 'user1';
      prisma.user.findMany.mockResolvedValue([mockUsers[0]]);
      prisma.user.count.mockResolvedValue(1);

      await adminController.getAllUsers(req, res);

      const whereClause = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereClause.OR).toBeDefined();
      expect(whereClause.OR).toHaveLength(4); // username, email, firstName, lastName
    });

    it('should validate role parameter', async () => {
      req.query.role = 'invalid_role';

      await adminController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: expect.stringContaining('Invalid role'),
        code: 'INVALID_ROLE',
        requestId: 'req123',
      });
    });

    it('should handle pagination parameters', async () => {
      req.query.page = '3';
      req.query.limit = '10';
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(50);

      await adminController.getAllUsers(req, res);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });
  });

  // getUserById function doesn't exist in adminController - tests removed

  describe('updateUserRole', () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      role: 'buyer',
    };

    beforeEach(() => {
      req.params.id = 'user123';
      req.body = { role: 'seller' };
    });

    it('should update user role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        role: 'seller',
      });

      await adminController.updateUserRole(req, res);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { role: 'seller' },
        select: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          user: expect.objectContaining({ role: 'seller' }),
        })
      );
    });

    it('should validate role value', async () => {
      req.body.role = 'invalid_role';
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await adminController.updateUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: expect.stringContaining('Invalid role'),
        code: 'INVALID_ROLE',
        requestId: 'req123',
      });
    });

    it('should fail if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await adminController.updateUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should prevent admin from changing their own role', async () => {
      req.user.id = 'user123'; // Same as target user
      req.body.role = 'buyer';
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await adminController.updateUserRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('Cannot change your own role'),
        })
      );
    });
  });

  describe('deleteUser', () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      role: 'buyer',
      orders: [],
      products: [],
      deliveries: [],
    };

    beforeEach(() => {
      req.params.id = 'user123';
    });

    it('should delete user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      await adminController.deleteUser(req, res);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });
    });

    it('should prevent deleting own account', async () => {
      req.user.id = 'user123'; // Same as target user
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('Cannot delete your own account'),
        })
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should prevent deleting users with active orders', async () => {
      mockUser.orders = [{ id: 'order1', status: 'paid' }];
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: expect.stringContaining('active orders'),
        })
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // getAllProducts and deleteProduct functions don't exist in adminController
  // Admin manages products through productController, not separate admin functions
});
