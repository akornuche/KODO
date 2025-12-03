const reviewController = require('../../../src/controllers/reviewController');
const prisma = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  review: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
  product: {
    update: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Review Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user123', role: 'buyer' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const mockOrder = {
      id: 'order1',
      buyerId: 'user123',
      productId: 'prod1',
      status: 'completed',
      product: { id: 'prod1', title: 'Test Product' },
      review: null,
    };

    beforeEach(() => {
      req.body = {
        orderId: 'order1',
        rating: 5,
        comment: 'Great product!',
      };
      // Reset mockOrder to original state
      mockOrder.status = 'completed';
      mockOrder.review = null;
    });

    it('should create review successfully', async () => {
      const mockReview = {
        id: '123',
        orderId: 'order1',
        productId: 'prod1',
        userId: 'user123',
        rating: 5,
        comment: 'Great product!',
        user: { id: 'user123', username: 'testuser' },
        product: { id: 'prod1', title: 'Test Product' },
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.review.create.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 10 });

      await reviewController.createReview(req, res);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order1',
          productId: 'prod1',
          userId: 'user123',
          rating: 5,
          comment: 'Great product!',
        },
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Review created successfully',
        review: mockReview,
      });
    });

    it('should fail if orderId or rating missing', async () => {
      req.body = { comment: 'Great!' };

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Order ID and rating are required',
        code: 'MISSING_FIELDS',
        requestId: undefined,
      });
    });

    it('should fail if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId: undefined,
      });
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('should fail if order not completed', async () => {
      mockOrder.status = 'pending';
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Can only review completed orders',
        code: 'ORDER_NOT_COMPLETED',
        requestId: undefined,
      });
    });

    it('should fail if user not buyer of order', async () => {
      req.user.id = 'otherUser';
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Only the buyer can review this order',
        code: 'FORBIDDEN',
        requestId: undefined,
      });
    });

    it('should fail if review already exists', async () => {
      const orderWithReview = {
        ...mockOrder,
        review: { id: 'existing' },
      };
      prisma.order.findUnique.mockResolvedValue(orderWithReview);

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Review already exists for this order',
        code: 'REVIEW_EXISTS',
        requestId: undefined,
      });
    });

    it('should validate rating range', async () => {
      req.body.rating = 6;
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      await reviewController.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Rating must be between 1 and 5',
        code: 'INVALID_RATING',
        requestId: undefined,
      });
    });
  });

  describe('getProductReviews', () => {
    const mockReviews = [
      {
        id: '1',
        productId: 'prod1',
        rating: 5,
        comment: 'Great!',
        user: { id: 'user1', username: 'buyer1' },
      },
      {
        id: '2',
        productId: 'prod1',
        rating: 4,
        comment: 'Good',
        user: { id: 'user2', username: 'buyer2' },
      },
    ];

    beforeEach(() => {
      req.params.productId = 'prod1';
    });

    it('should get product reviews', async () => {
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(2);

      await reviewController.getProductReviews(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'prod1' },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        items: mockReviews,
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasMore: false,
        },
      });
    });

    it('should handle pagination', async () => {
      req.query.page = '2';
      req.query.limit = '5';
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(10);

      await reviewController.getProductReviews(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            page: 2,
            limit: 5,
            total: 10,
            totalPages: 2,
            hasMore: true,
          }),
        })
      );
    });

    it('should sort by rating', async () => {
      req.query.sortBy = 'rating';
      req.query.sortOrder = 'asc';
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(2);

      await reviewController.getProductReviews(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'asc' },
        })
      );
    });

    it('should sort by created date descending', async () => {
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(2);

      await reviewController.getProductReviews(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getUserReviews', () => {
    const mockReviews = [
      {
        id: '1',
        userId: 'user1',
        productId: 'prod1',
        rating: 5,
        comment: 'Excellent product!',
        product: { id: 'prod1', title: 'Test Product', images: [] },
        order: { id: 'order1', status: 'completed' },
      },
    ];

    beforeEach(() => {
      req.params.userId = 'user1';
    });

    it('should get user reviews', async () => {
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      await reviewController.getUserReviews(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1' },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
            order: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        items: mockReviews,
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
      });
    });
  });

  describe('updateReview', () => {
    const mockReview = {
      id: '123',
      userId: 'user123',
      productId: 'prod1',
      rating: 5,
      comment: 'Great!',
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = {
        rating: 4,
        comment: 'Good product',
      };
    });

    it('should update own review', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.update.mockResolvedValue({
        ...mockReview,
        rating: 4,
        comment: 'Good product',
      });

      await reviewController.updateReview(req, res);

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          rating: 4,
          comment: 'Good product',
        },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Review updated successfully',
        review: expect.objectContaining({
          rating: 4,
          comment: 'Good product',
        }),
      });
    });

    it('should fail for unauthorized user', async () => {
      req.user.id = 'otherUser';
      prisma.review.findUnique.mockResolvedValue(mockReview);

      await reviewController.updateReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'You can only update your own reviews',
        code: 'FORBIDDEN',
        requestId: undefined,
      });
    });

    it('should return 404 for non-existent review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await reviewController.updateReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
        requestId: undefined,
      });
    });
  });

  describe('deleteReview', () => {
    const mockReview = {
      id: '123',
      userId: 'user123',
      productId: 'prod1',
    };

    beforeEach(() => {
      req.params.id = '123';
    });

    it('should delete own review', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.delete.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 9 });

      await reviewController.deleteReview(req, res);

      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Review deleted successfully',
      });
    });

    it('should allow admin to delete any review', async () => {
      req.user = { id: 'admin1', role: 'admin' };
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.delete.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 9 });

      await reviewController.deleteReview(req, res);

      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Review deleted successfully',
      });
    });

    it('should fail for unauthorized user', async () => {
      req.user.id = 'otherUser';
      prisma.review.findUnique.mockResolvedValue(mockReview);

      await reviewController.deleteReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'You can only delete your own reviews',
        code: 'FORBIDDEN',
        requestId: undefined,
      });
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await reviewController.deleteReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Review not found',
        code: 'REVIEW_NOT_FOUND',
        requestId: undefined,
      });
    });
  });
});
