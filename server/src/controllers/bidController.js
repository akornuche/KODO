const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { broadcastNewRequest, notifyNewOffer, notifyOfferAccepted } = require('../lib/socket');
const { sendEmail, templates } = require('../lib/email');
const { sendNewOfferNotification, sendOfferAcceptedNotification } = require('./notificationsController');

/**
 * Create a new bid/request (buyer posts request)
 * POST /api/requests
 */
exports.createRequest = async (req, res) => {
  try {
    const { title, message, amount, productId, category, description, location, condition } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount) {
      return res.status(400).json({
        error: true,
        message: 'Amount is required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT',
        requestId: req.id,
      });
    }

    // If productId is provided, verify it exists
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          error: true,
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
          requestId: req.id,
        });
      }
    }

    // Create bid/request
    const bid = await prisma.bid.create({
      data: {
        productId: productId || null,
        buyerId: userId,
        amount,
        message: message || description, // Use message or fallback to description
        status: 'open',
        title,
        category,
        description,
        location,
        condition,
      },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
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
    });

    logger.info(`Request/Bid created: ${bid.id}`, {
      requestId: req.id,
      userId,
      bidId: bid.id,
      productId: productId || 'general',
    });

    // Broadcast to all sellers
    broadcastNewRequest(bid);

    res.status(201).json({
      message: 'Request created successfully',
      bid,
    });
  } catch (error) {
    logger.error('Create request error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to create request',
      code: 'REQUEST_CREATE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get all requests/bids (feed for sellers)
 * GET /api/requests
 */
exports.getAllRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'open',
      productId = '',
      buyerId = '',
      category = '',
      maxAmount = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      q = '',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.productId = productId;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (category) {
      where.category = category;
    }

    if (maxAmount) {
      where.amount = { lte: parseFloat(maxAmount) };
    }

    // Text search
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        {
          buyer: {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Get requests with buyer and product info
    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              description: true,
            },
          },
        },
      }),
      prisma.bid.count({ where }),
    ]);

    logger.info(`Retrieved ${bids.length} requests`, {
      requestId: req.id,
      page: pageNum,
      total,
    });

    res.json({
      items: bids,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + bids.length < total,
      },
    });
  } catch (error) {
    logger.error('Get requests error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve requests',
      code: 'REQUESTS_FETCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get single request/bid by ID
 * GET /api/requests/:id
 */
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const bid = await prisma.bid.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            seller: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!bid) {
      return res.status(404).json({
        error: true,
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND',
        requestId: req.id,
      });
    }

    logger.info(`Retrieved request ${id}`, { requestId: req.id });

    res.json({ bid });
  } catch (error) {
    logger.error('Get request by ID error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve request',
      code: 'REQUEST_FETCH_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Seller submits an offer to a request (creates a counter-bid or responds)
 * POST /api/requests/:id/offers
 * Note: This creates an Order in pending state, waiting for buyer acceptance
 */
exports.submitOffer = async (req, res) => {
  try {
    const { id } = req.params; // bid/request ID
    const { amount, message, productId } = req.body;
    const sellerId = req.user.id;

    // Validation
    if (!amount || !productId) {
      return res.status(400).json({
        error: true,
        message: 'Amount and productId are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT',
        requestId: req.id,
      });
    }

    // Check if request exists
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: { buyer: true },
    });

    if (!bid) {
      return res.status(404).json({
        error: true,
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (bid.status !== 'open') {
      return res.status(400).json({
        error: true,
        message: 'This request is no longer open',
        code: 'REQUEST_CLOSED',
        requestId: req.id,
      });
    }

    // Verify product exists and belongs to seller
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        error: true,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        requestId: req.id,
      });
    }

    if (product.sellerId !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only offer your own products',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Create a pending order (represents the seller's offer)
    const order = await prisma.order.create({
      data: {
        buyerId: bid.buyerId,
        productId: product.id,
        quantity: 1,
        totalAmount: amount,
        status: 'pending', // Waiting for buyer acceptance
      },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        product: {
          include: {
            seller: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Offer submitted for request ${id}`, {
      requestId: req.id,
      sellerId,
      orderId: order.id,
      bidId: id,
    });

    // Notify buyer of new offer
    notifyNewOffer(bid.buyerId, { order, message, bid });

    // Send email notification to buyer (async, don't block response)
    sendNewOfferNotification(bid, { amount }, product);

    res.status(201).json({
      message: 'Offer submitted successfully',
      order,
      note: 'Order is pending buyer acceptance',
    });
  } catch (error) {
    logger.error('Submit offer error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to submit offer',
      code: 'OFFER_SUBMIT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Buyer accepts an offer (marks bid as accepted)
 * PUT /api/offers/:id/accept
 */
exports.acceptOffer = async (req, res) => {
  try {
    const { id } = req.params; // bid ID
    const userId = req.user.id;

    // Find the bid
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
      },
    });

    if (!bid) {
      return res.status(404).json({
        error: true,
        message: 'Bid not found',
        code: 'BID_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Verify ownership
    if (bid.buyerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: true,
        message: 'You can only accept your own bids',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    if (bid.status !== 'open') {
      return res.status(400).json({
        error: true,
        message: 'This bid is no longer open',
        code: 'BID_CLOSED',
        details: { currentStatus: bid.status },
        requestId: req.id,
      });
    }

    // If productId exists, create order
    let order = null;
    if (bid.productId) {
      order = await prisma.order.create({
        data: {
          buyerId: bid.buyerId,
          productId: bid.productId,
          quantity: 1,
          totalAmount: bid.amount,
          status: 'pending',
        },
        include: {
          product: {
            include: {
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      logger.info(`Order created from accepted bid: ${order.id}`, {
        requestId: req.id,
        bidId: id,
        orderId: order.id,
      });
    }

    // Update bid status
    const updatedBid = await prisma.bid.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
            email: true,
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
    });

    logger.info(`Bid accepted: ${id}`, {
      requestId: req.id,
      userId,
      bidId: id,
      orderId: order?.id,
    });

    // Notify seller of accepted offer
    if (updatedBid.product?.sellerId) {
      notifyOfferAccepted(updatedBid.product.sellerId, { bid: updatedBid, order });

      // Send email notification to seller (async, don't block response)
      if (bid.product?.seller?.email) {
        sendOfferAcceptedNotification(updatedBid, bid.product);
      }
    }

    res.json({
      message: 'Offer accepted successfully',
      bid: updatedBid,
      ...(order && { order }),
    });
  } catch (error) {
    logger.error('Accept offer error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to accept offer',
      code: 'OFFER_ACCEPT_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Buyer or seller withdraws/rejects a bid
 * PUT /api/requests/:id/status
 */
exports.updateBidStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const validStatuses = ['withdrawn', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
        requestId: req.id,
      });
    }

    // Find bid
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!bid) {
      return res.status(404).json({
        error: true,
        message: 'Bid not found',
        code: 'BID_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Verify ownership (buyer can withdraw, seller can reject)
    const isBuyer = bid.buyerId === userId;
    const isSeller = bid.product?.sellerId === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You cannot modify this bid',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Update status
    const updatedBid = await prisma.bid.update({
      where: { id },
      data: { status },
      include: {
        buyer: {
          select: {
            id: true,
            username: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    logger.info(`Bid status updated: ${id} -> ${status}`, {
      requestId: req.id,
      userId,
      bidId: id,
    });

    res.json({
      message: 'Bid status updated successfully',
      bid: updatedBid,
    });
  } catch (error) {
    logger.error('Update bid status error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update bid status',
      code: 'BID_UPDATE_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Search bids/requests with advanced filtering (admin only)
 * GET /api/admin/bids/search
 */
exports.searchBids = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      status = '',
      buyerId = '',
      productId = '',
      minAmount = '',
      maxAmount = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    // Text search across bid details
    if (q) {
      where.OR = [
        // Search in buyer username/email
        {
          buyer: {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        // Search in product title (if product exists)
        {
          product: {
            title: { contains: q, mode: 'insensitive' },
          },
        },
        // Search in bid message
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Apply filters
    if (status) {
      const validStatuses = ['open', 'accepted', 'withdrawn', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: true,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS',
          requestId: req.id,
        });
      }
      where.status = status;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (productId) {
      where.productId = productId;
    }

    // Amount range filtering
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt', 'amount', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get bids with pagination
    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderByField]: orderDirection },
        include: {
          buyer: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              seller: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.bid.count({ where }),
    ]);

    // Get bid analytics
    const bidAnalytics = await getBidAnalytics(where);

    logger.info('Admin searched bids', {
      requestId: req.id,
      adminId: req.user.id,
      query: q,
      count: bids.length,
      total,
      filters: { status, buyerId, productId, minAmount, maxAmount, dateFrom, dateTo },
    });

    res.json({
      query: q || null,
      items: bids,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + bids.length < total,
      },
      analytics: bidAnalytics,
      appliedFilters: {
        status: status || null,
        buyerId: buyerId || null,
        productId: productId || null,
        amountRange: minAmount || maxAmount ? { min: minAmount, max: maxAmount } : null,
        dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
      },
    });
  } catch (error) {
    logger.error('Search bids error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to search bids',
      code: 'SEARCH_BIDS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get bid analytics for search results
 * @param {Object} whereClause - Prisma where clause for filtering
 * @returns {Object} Analytics data
 */
const getBidAnalytics = async (whereClause) => {
  try {
    const [
      totalBids,
      bidsByStatus,
      averageAmount,
      bidsWithProducts,
      bidsWithoutProducts,
      conversionRate,
    ] = await Promise.all([
      prisma.bid.count({ where: whereClause }),
      prisma.bid.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      prisma.bid.aggregate({
        where: whereClause,
        _avg: { amount: true },
      }),
      prisma.bid.count({
        where: {
          ...whereClause,
          productId: { not: null },
        },
      }),
      prisma.bid.count({
        where: {
          ...whereClause,
          productId: null,
        },
      }),
      // Calculate conversion rate (accepted bids / total bids)
      prisma.bid.count({
        where: {
          ...whereClause,
          status: 'accepted',
        },
      }).then(acceptedCount =>
        prisma.bid.count({ where: whereClause }).then(total =>
          total > 0 ? ((acceptedCount / total) * 100).toFixed(1) : 0
        )
      ),
    ]);

    return {
      overview: {
        totalBids,
        averageAmount: averageAmount._avg.amount || 0,
        conversionRate: `${conversionRate}%`,
      },
      byStatus: bidsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byType: {
        withProducts: bidsWithProducts,
        generalRequests: bidsWithoutProducts,
      },
    };
  } catch (error) {
    logger.error('Get bid analytics error:', { error: error.message });
    return null;
  }
};
