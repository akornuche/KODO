const prisma = require('./prisma');
const logger = require('./logger');

/**
 * Optimized database query helpers
 * Provides efficient queries with proper indexing and caching
 */
class QueryOptimizer {
  /**
   * Get products with optimized queries and filtering
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   */
  async getProducts(filters = {}, options = {}) {
    const {
      category,
      minPrice,
      maxPrice,
      condition,
      location,
      sellerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    const {
      includeSeller = false,
      includeImages = true,
      includeReviews = false,
    } = options;

    // Build where clause
    const where = {
      AND: [],
    };

    if (category) where.AND.push({ category });
    if (condition) where.AND.push({ condition });
    if (location) where.AND.push({ location: { contains: location, mode: 'insensitive' } });
    if (sellerId) where.AND.push({ sellerId });
    if (minPrice !== undefined) where.AND.push({ price: { gte: minPrice } });
    if (maxPrice !== undefined) where.AND.push({ price: { lte: maxPrice } });

    // Search functionality
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search] } },
        ],
      });
    }

    // Build order by
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Build include
    const include = {};
    if (includeSeller) {
      include.seller = {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          averageRating: true,
        },
      };
    }
    if (includeImages) {
      include.images = {
        where: { order: 0 }, // Only main image
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          alt: true,
        },
        take: 1,
      };
    }
    if (includeReviews) {
      include.reviews = {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      };
    }

    try {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include,
          orderBy,
          take: limit,
          skip: offset,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products,
        total,
        hasMore: offset + limit < total,
        nextOffset: offset + limit,
      };
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get user dashboard data with optimized queries
   * @param {string} userId - User ID
   * @param {string} role - User role
   */
  async getUserDashboard(userId, role) {
    try {
      const baseSelect = {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      };

      let dashboardData = {};

      if (role === 'buyer') {
        // Buyer's dashboard
        const [activeOrders, recentBids, savedProducts] = await Promise.all([
          prisma.order.findMany({
            where: { buyerId: userId, status: { in: ['pending', 'paid', 'shipped'] } },
            select: {
              ...baseSelect,
              totalAmount: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  images: {
                    where: { order: 0 },
                    select: { url: true, thumbnailUrl: true },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
          prisma.bid.findMany({
            where: { buyerId: userId },
            select: {
              ...baseSelect,
              amount: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  images: {
                    where: { order: 0 },
                    select: { url: true, thumbnailUrl: true },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          // Note: This would need a saved products table in a real implementation
          Promise.resolve([]),
        ]);

        dashboardData = {
          activeOrders,
          recentBids,
          savedProducts,
        };
      } else if (role === 'seller') {
        // Seller's dashboard
        const [activeProducts, recentOrders, pendingBids] = await Promise.all([
          prisma.product.findMany({
            where: { sellerId: userId },
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              createdAt: true,
              _count: {
                select: {
                  bids: true,
                  orders: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.order.findMany({
            where: {
              product: { sellerId: userId },
              status: { in: ['paid', 'shipped', 'completed'] }
            },
            select: {
              ...baseSelect,
              totalAmount: true,
              buyer: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
          prisma.bid.findMany({
            where: {
              product: { sellerId: userId },
              status: 'open'
            },
            select: {
              ...baseSelect,
              amount: true,
              buyer: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
              product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

        dashboardData = {
          activeProducts,
          recentOrders,
          pendingBids,
        };
      } else if (role === 'courier') {
        // Courier's dashboard
        const [activeDeliveries, completedDeliveries] = await Promise.all([
          prisma.delivery.findMany({
            where: {
              courierId: userId,
              status: { in: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'] }
            },
            select: {
              ...baseSelect,
              status: true,
              tracking: true,
              order: {
                select: {
                  id: true,
                  totalAmount: true,
                  buyer: {
                    select: {
                      id: true,
                      username: true,
                      avatarUrl: true,
                    },
                  },
                  product: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
          prisma.delivery.count({
            where: {
              courierId: userId,
              status: 'delivered',
            },
          }),
        ]);

        dashboardData = {
          activeDeliveries,
          completedDeliveriesCount: completedDeliveries,
        };
      }

      return dashboardData;
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get order details with optimized joins
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID for authorization
   */
  async getOrderDetails(orderId, userId) {
    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          OR: [
            { buyerId: userId },
            { product: { sellerId: userId } },
          ],
        },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              phoneNumber: true,
            },
          },
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  phoneNumber: true,
                  stripeAccountId: true,
                },
              },
              images: {
                select: {
                  id: true,
                  url: true,
                  thumbnailUrl: true,
                  alt: true,
                },
                orderBy: { order: 'asc' },
              },
              reviews: {
                select: {
                  id: true,
                  rating: true,
                  comment: true,
                  createdAt: true,
                  user: {
                    select: {
                      id: true,
                      username: true,
                      avatarUrl: true,
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
          delivery: {
            include: {
              courier: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  phoneNumber: true,
                },
              },
            },
          },
          escrow: true,
          review: true,
          refund: {
            include: {
              processor: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found or access denied');
      }

      return order;
    } catch (error) {
      logger.error('Error fetching order details:', error);
      throw error;
    }
  }

  /**
   * Search products with full-text search optimization
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @param {Object} options - Query options
   */
  async searchProducts(query, filters = {}, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      // Use PostgreSQL full-text search for better performance
      const products = await prisma.$queryRaw`
        SELECT
          p.id,
          p.title,
          p.description,
          p.price,
          p.category,
          p.condition,
          p.location,
          p."averageRating",
          p."reviewCount",
          p."createdAt",
          p."sellerId",
          u.username as "sellerUsername",
          u."avatarUrl" as "sellerAvatar",
          pi.url as "mainImageUrl",
          pi."thumbnailUrl" as "mainImageThumbnail",
          ts_rank_cd(p."searchVector", plainto_tsquery('english', ${query})) as rank
        FROM "Product" p
        LEFT JOIN "User" u ON p."sellerId" = u.id
        LEFT JOIN "ProductImage" pi ON p.id = pi."productId" AND pi.order = 0
        WHERE p."searchVector" @@ plainto_tsquery('english', ${query})
          AND (${filters.category}::text IS NULL OR p.category = ${filters.category})
          AND (${filters.minPrice}::float IS NULL OR p.price >= ${filters.minPrice})
          AND (${filters.maxPrice}::float IS NULL OR p.price <= ${filters.maxPrice})
          AND (${filters.condition}::text IS NULL OR p.condition = ${filters.condition})
        ORDER BY rank DESC, p."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      // Get total count
      const totalResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Product" p
        WHERE p."searchVector" @@ plainto_tsquery('english', ${query})
          AND (${filters.category}::text IS NULL OR p.category = ${filters.category})
          AND (${filters.minPrice}::float IS NULL OR p.price >= ${filters.minPrice})
          AND (${filters.maxPrice}::float IS NULL OR p.price <= ${filters.maxPrice})
          AND (${filters.condition}::text IS NULL OR p.condition = ${filters.condition});
      `;

      return {
        products,
        total: parseInt(totalResult[0].count),
        hasMore: offset + limit < parseInt(totalResult[0].count),
        nextOffset: offset + limit,
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      // Fallback to basic search if full-text search fails
      return this.getProducts({ ...filters, search: query }, options);
    }
  }

  /**
   * Get analytics data with optimized aggregation queries
   * @param {Object} filters - Date range and other filters
   */
  async getAnalytics(filters = {}) {
    const { startDate, endDate, sellerId } = filters;

    try {
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      const [orderStats, productStats, userStats] = await Promise.all([
        // Order statistics
        prisma.$queryRaw`
          SELECT
            COUNT(*) as total_orders,
            SUM("totalAmount") as total_revenue,
            AVG("totalAmount") as avg_order_value,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
          FROM "Order"
          WHERE (${startDate}::timestamp IS NULL OR "createdAt" >= ${startDate}::timestamp)
            AND (${endDate}::timestamp IS NULL OR "createdAt" <= ${endDate}::timestamp)
            AND (${sellerId}::text IS NULL OR "productId" IN (
              SELECT id FROM "Product" WHERE "sellerId" = ${sellerId}
            ));
        `,

        // Product statistics
        prisma.$queryRaw`
          SELECT
            COUNT(*) as total_products,
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price
          FROM "Product"
          WHERE (${sellerId}::text IS NULL OR "sellerId" = ${sellerId})
            AND (${startDate}::timestamp IS NULL OR "createdAt" >= ${startDate}::timestamp)
            AND (${endDate}::timestamp IS NULL OR "createdAt" <= ${endDate}::timestamp);
        `,

        // User statistics
        prisma.$queryRaw`
          SELECT
            COUNT(CASE WHEN role = 'buyer' THEN 1 END) as total_buyers,
            COUNT(CASE WHEN role = 'seller' THEN 1 END) as total_sellers,
            COUNT(CASE WHEN role = 'courier' THEN 1 END) as total_couriers
          FROM "User"
          WHERE ${startDate}::timestamp IS NULL OR "createdAt" >= ${startDate}::timestamp;
        `,
      ]);

      return {
        orders: orderStats[0],
        products: productStats[0],
        users: userStats[0],
      };
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      throw error;
    }
  }
}

module.exports = new QueryOptimizer();