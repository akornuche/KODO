const productController = require('../../../src/controllers/productController');
const prisma = require('../../../src/lib/prisma');

jest.mock('../../../src/lib/prisma', () => ({
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  productImage: {
    findMany: jest.fn(),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../../src/lib/upload', () => ({
  processImage: jest.fn(),
  generateThumbnail: jest.fn(),
  deleteImages: jest.fn(),
  getPublicUrl: jest.fn((url) => url),
  getFilePathFromUrl: jest.fn((url) => url),
}));

describe('Product Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'seller123', role: 'seller' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    const mockProducts = [
      {
        id: '1',
        title: 'Product 1',
        price: 100,
        sellerId: 'seller123',
        status: 'active',
      },
      {
        id: '2',
        title: 'Product 2',
        price: 200,
        sellerId: 'seller456',
        status: 'active',
      },
    ];

    it('should get products with default pagination', async () => {
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(2);
      // Mock facets
      prisma.product.groupBy.mockResolvedValue([]);

      await productController.getAllProducts(req, res);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        items: mockProducts,
        meta: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 2,
        }),
        facets: expect.any(Object),
      });
    });

    it('should apply search filter', async () => {
      req.query.search = 'laptop';
      prisma.product.findMany.mockResolvedValue([mockProducts[0]]);
      prisma.product.count.mockResolvedValue(1);

      await productController.getAllProducts(req, res);

      const whereClause = prisma.product.findMany.mock.calls[0][0].where;
      expect(whereClause).toHaveProperty('OR');
      expect(whereClause.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: { contains: 'laptop', mode: 'insensitive' } }),
          expect.objectContaining({ description: { contains: 'laptop', mode: 'insensitive' } }),
        ])
      );
    });

    it('should apply price range filter', async () => {
      req.query.minPrice = '50';
      req.query.maxPrice = '150';
      prisma.product.findMany.mockResolvedValue([mockProducts[0]]);
      prisma.product.count.mockResolvedValue(1);

      await productController.getAllProducts(req, res);

      const whereClause = prisma.product.findMany.mock.calls[0][0].where;
      expect(whereClause.price).toEqual({
        gte: 50,
        lte: 150,
      });
    });

    it('should apply category filter', async () => {
      req.query.category = 'Electronics';
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(2);

      await productController.getAllProducts(req, res);

      const whereClause = prisma.product.findMany.mock.calls[0][0].where;
      expect(whereClause.category).toEqual({
        equals: 'Electronics',
      });
    });

    it('should apply seller filter', async () => {
      req.query.sellerId = 'seller123';
      prisma.product.findMany.mockResolvedValue([mockProducts[0]]);
      prisma.product.count.mockResolvedValue(1);

      await productController.getAllProducts(req, res);

      const whereClause = prisma.product.findMany.mock.calls[0][0].where;
      expect(whereClause.sellerId).toBe('seller123');
    });

    it('should handle pagination correctly', async () => {
      req.query.page = '2';
      req.query.limit = '10';
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(25);
      prisma.product.groupBy.mockResolvedValue([]);

      await productController.getAllProducts(req, res);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        items: mockProducts,
        meta: expect.objectContaining({
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasMore: true,
        }),
        facets: expect.any(Object),
      });
    });

    it('should handle sorting', async () => {
      req.query.sortBy = 'price';
      req.query.sortOrder = 'asc';
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(2);

      await productController.getAllProducts(req, res);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        })
      );
    });

    it('should handle database errors', async () => {
      prisma.product.findMany.mockRejectedValue(new Error('Database error'));

      await productController.getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Failed to retrieve products',
        code: 'PRODUCTS_FETCH_ERROR',
        requestId: undefined,
      });
    });
  });

  describe('getProductById', () => {
    const mockProduct = {
      id: '123',
      title: 'Test Product',
      price: 100,
      sellerId: 'seller123',
      seller: {
        id: 'seller123',
        username: 'testuser',
      },
    };

    beforeEach(() => {
      req.params.id = '123';
    });

    it('should get product by id successfully', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      await productController.getProductById(req, res);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        product: mockProduct,
      });
    });

    it('should return 404 for non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: undefined,
      });
    });

    it('should handle invalid product id', async () => {
      req.params.id = 'invalid-id';
      prisma.product.findUnique.mockRejectedValue(new Error('Invalid ID'));

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createProduct', () => {
    beforeEach(() => {
      req.body = {
        title: 'New Product',
        description: 'Product description',
        price: 100,
        category: 'Electronics',
        condition: 'new',
      };
    });

    it('should create product successfully', async () => {
      const mockCreatedProduct = {
        id: '123',
        ...req.body,
        sellerId: req.user.userId,
        status: 'active',
      };

      prisma.product.create.mockResolvedValue(mockCreatedProduct);

      await productController.createProduct(req, res);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: req.body.title,
          price: req.body.price,
          sellerId: req.user.id,
        }),
        include: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product created successfully',
        product: mockCreatedProduct,
      });
    });

    it('should fail without seller role', async () => {
      req.user.role = 'buyer';

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Only sellers can create products',
        code: 'FORBIDDEN',
        requestId: undefined,
      });
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      req.body = { title: 'Product' }; // Missing price

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Title and price are required',
        code: 'MISSING_FIELDS',
        requestId: undefined,
      });
    });
  });

  describe('updateProduct', () => {
    const mockProduct = {
      id: '123',
      title: 'Product',
      sellerId: 'seller123',
    };

    beforeEach(() => {
      req.params.id = '123';
      req.body = { title: 'Updated Product', price: 150 };
    });

    it('should update own product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({
        ...mockProduct,
        ...req.body,
      });

      await productController.updateProduct(req, res);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: req.body,
        include: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product updated successfully',
        product: expect.objectContaining({
          ...mockProduct,
          ...req.body,
        }),
      });
    });

    it('should fail to update another seller\'s product', async () => {
      mockProduct.sellerId = 'otherSeller';
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'You can only update your own products',
        code: 'FORBIDDEN',
        requestId: undefined,
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    const mockProduct = {
      id: '123',
      sellerId: 'seller123',
      _count: {
        orders: 0,
      },
    };

    beforeEach(() => {
      req.params.id = '123';
      // Mock productImage.findMany to return empty array (no images)
      prisma.productImage.findMany.mockResolvedValue([]);
    });

    it('should delete own product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.product.delete.mockResolvedValue(mockProduct);

      await productController.deleteProduct(req, res);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      });
      expect(prisma.productImage.findMany).toHaveBeenCalledWith({
        where: { productId: '123' },
        select: { publicId: true },
      });
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product deleted successfully',
      });
    });

    it('should fail to delete another seller\'s product', async () => {
      mockProduct.sellerId = 'otherSeller';
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
