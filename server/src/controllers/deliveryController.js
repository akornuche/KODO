const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { broadcastDeliveryUpdate, notifyAvailableDelivery, emitToUser } = require('../lib/socket');
const { sendEmail, templates } = require('../lib/email');
const {
  sendDeliveryAssignedNotification,
  sendDeliveryUpdateNotification,
  sendOrderCompletedNotification,
} = require('./notificationsController');

/**
 * Get available deliveries for couriers (pending/unassigned) with enhanced search
 * GET /api/deliveries/available
 */
exports.getAvailableDeliveries = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      lat,
      lng,
      radius = 50,
      page = '1',
      limit = '10',
      location = '',
      q = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      status: 'pending',
      courierId: null,
    };

    // Enhanced location filtering
    if (location) {
      where.OR = [
        { pickupAddress: { contains: location, mode: 'insensitive' } },
        { deliveryAddress: { contains: location, mode: 'insensitive' } },
        // Search in buyer/seller names if location matches
        {
          order: {
            buyer: {
              OR: [
                { username: { contains: location, mode: 'insensitive' } },
                { firstName: { contains: location, mode: 'insensitive' } },
                { lastName: { contains: location, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          order: {
            product: {
              seller: {
                OR: [
                  { username: { contains: location, mode: 'insensitive' } },
                  { firstName: { contains: location, mode: 'insensitive' } },
                  { lastName: { contains: location, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    // General search across delivery and order details
    if (q) {
      where.OR = [
        { pickupAddress: { contains: q, mode: 'insensitive' } },
        { deliveryAddress: { contains: q, mode: 'insensitive' } },
        {
          order: {
            OR: [
              { buyer: { username: { contains: q, mode: 'insensitive' } } },
              { buyer: { email: { contains: q, mode: 'insensitive' } } },
              {
                product: {
                  OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { seller: { username: { contains: q, mode: 'insensitive' } } },
                    { seller: { email: { contains: q, mode: 'insensitive' } } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const deliveries = await prisma.delivery.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [orderByField]: orderDirection },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const total = await prisma.delivery.count({ where });

    logger.info('Available deliveries retrieved with enhanced search', {
      requestId: req.id,
      userId,
      count: deliveries.length,
      total,
      search: q,
      location,
    });

    res.status(200).json({
      deliveries,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + deliveries.length < total,
      },
      appliedFilters: {
        search: q || null,
        location: location || null,
        geoLocation: lat && lng ? { lat, lng, radius } : null,
      },
    });
  } catch (error) {
    logger.error('Get available deliveries error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve available deliveries',
      code: 'GET_DELIVERIES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get courier's assigned deliveries
 * GET /api/deliveries
 */
exports.getCourierDeliveries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = {
      courierId: userId,
    };

    // Filter by status if provided
    if (status) {
      const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'failed'];
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

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
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
        },
        courier: {
          select: {
            id: true,
            username: true,
            email: true,
            lastKnownLat: true,
            lastKnownLng: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info('Courier deliveries retrieved', {
      requestId: req.id,
      userId,
      count: deliveries.length,
    });

  res.status(200).json({ deliveries });
  } catch (error) {
    logger.error('Get courier deliveries error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve deliveries',
      code: 'GET_DELIVERIES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get delivery by ID
 * GET /api/deliveries/:id
 */
exports.getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
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
        },
        courier: {
          select: {
            id: true,
            username: true,
            email: true,
            lastKnownLat: true,
            lastKnownLng: true,
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Authorization: courier, buyer, seller, or admin
    const isCourier = delivery.courierId === userId;
    const isBuyer = delivery.order.buyerId === userId;
    const isSeller = delivery.order.product.sellerId === userId;
    const isAdmin = userRole === 'admin';

    if (!isCourier && !isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this delivery',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    logger.info('Delivery retrieved', { requestId: req.id, deliveryId: id, userId });

  res.status(200).json({ delivery });
  } catch (error) {
    logger.error('Get delivery by ID error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve delivery',
      code: 'GET_DELIVERY_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Courier accepts a delivery
 * POST /api/deliveries/:id/accept
 */
exports.acceptDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Check if delivery is still available
    if (delivery.status !== 'pending' || delivery.courierId !== null) {
      return res.status(400).json({
        error: true,
        message: 'This delivery is no longer available',
        code: 'DELIVERY_UNAVAILABLE',
        requestId: req.id,
      });
    }

    // Assign courier and update status
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        courierId: userId,
        status: 'assigned',
        acceptedAt: new Date(),
      },
      include: {
        order: {
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
        },
        courier: {
          select: {
            id: true,
            username: true,
            email: true,
            lastKnownLat: true,
            lastKnownLng: true,
          },
        },
      },
    });

    logger.info('Delivery accepted by courier', {
      requestId: req.id,
      deliveryId: id,
      courierId: userId,
    });

    // Broadcast update via Socket.IO
    broadcastDeliveryUpdate(updatedDelivery);

    // Notify buyer and seller
    emitToUser(delivery.order.buyerId, 'deliveryUpdated', { delivery: updatedDelivery });
    emitToUser(delivery.order.product.sellerId, 'deliveryUpdated', { delivery: updatedDelivery });

    // Send email notifications (async, don't block response)
    sendDeliveryAssignedNotification(updatedDelivery.order, updatedDelivery);

    res.status(200).json({
      message: 'Delivery accepted successfully',
      delivery: updatedDelivery,
    });
  } catch (error) {
    logger.error('Accept delivery error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to accept delivery',
      code: 'ACCEPT_DELIVERY_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update delivery location (courier GPS update)
 * PUT /api/deliveries/:id/location
 */
exports.updateDeliveryLocation = async (req, res) => {
  try {
  const { id } = req.params;
  let { lat, lng, accuracy, speed, heading, source = 'manual' } = req.body;
  // Support both `lat`/`lng` and `latitude`/`longitude` in tests/clients
  if (lat === undefined && req.body.latitude !== undefined) lat = req.body.latitude;
  if (lng === undefined && req.body.longitude !== undefined) lng = req.body.longitude;
    const userId = req.user.id;

    // Validation
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        error: true,
        message: 'Invalid coordinates. Lat and lng must be numbers',
        code: 'INVALID_COORDINATES',
        requestId: req.id,
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: true,
        message: 'Coordinates out of range',
        code: 'INVALID_COORDINATES',
        requestId: req.id,
      });
    }

    // Find delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!delivery) {
      return res.status(404).json({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Authorization: only assigned courier can update location
    if (delivery.courierId !== userId) {
      return res.status(403).json({
        error: true,
        message: 'Only the assigned courier can update delivery location',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Do not allow location updates for completed/failed deliveries
    if (delivery.status === 'delivered' || delivery.status === 'failed') {
      return res.status(400).json({
        error: true,
        message: 'Cannot update location for inactive delivery',
        code: 'INVALID_DELIVERY_STATE',
        requestId: req.id,
      });
    }

    // Save location to history table
    await prisma.deliveryLocation.create({
      data: {
        deliveryId: id,
        lat,
        lng,
        accuracy,
        speed,
        heading,
        source,
      },
    });

    // Update delivery's current location
    await prisma.delivery.update({
      where: { id },
      data: {
        currentLat: lat,
        currentLng: lng,
        locationUpdatedAt: new Date(),
      },
    });

    // Update courier's last known location in User table
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastKnownLat: lat,
        lastKnownLng: lng,
      },
    });

    logger.info('Courier location updated', {
      requestId: req.id,
      deliveryId: id,
      courierId: userId,
      lat,
      lng,
      source,
    });

    // Get updated delivery with courier location
    const updatedDelivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
          },
        },
        courier: {
          select: {
            id: true,
            username: true,
            email: true,
            lastKnownLat: true,
            lastKnownLng: true,
          },
        },
      },
    });

    // Broadcast location update via Socket.IO
    broadcastDeliveryUpdate(updatedDelivery);

    res.status(200).json({
      message: 'Location updated successfully',
      delivery: updatedDelivery,
      location: { lat, lng, accuracy, speed, heading, source },
    });
  } catch (error) {
    logger.error('Update delivery location error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update location',
      code: 'UPDATE_LOCATION_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update delivery status
 * PUT /api/deliveries/:id/status
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
        requestId: req.id,
      });
    }

    // Find delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
            escrow: true,
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        error: true,
        message: 'Delivery not found',
        code: 'DELIVERY_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Authorization: courier or admin
    const isCourier = delivery.courierId === userId;
    const isAdmin = userRole === 'admin';

    if (!isCourier && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'Only the assigned courier or admin can update delivery status',
        code: 'FORBIDDEN',
        requestId: req.id,
      });
    }

    // Update delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: { status },
      include: {
        order: {
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
        },
        courier: {
          select: {
            id: true,
            username: true,
            email: true,
            lastKnownLat: true,
            lastKnownLng: true,
          },
        },
      },
    });

    logger.info('Delivery status updated', {
      requestId: req.id,
      deliveryId: id,
      oldStatus: delivery.status,
      newStatus: status,
      userId,
    });

    // If status is 'delivered', update order status to 'shipped' or 'completed'
    if (status === 'delivered') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'completed' },
      });

      logger.info('Order completed after delivery', {
        requestId: req.id,
        orderId: delivery.orderId,
        deliveryId: id,
      });

      // Auto-release escrow if exists
      if (delivery.order.escrow && !delivery.order.escrow.released) {
        const { autoReleaseEscrow } = require('./orderController');
        await autoReleaseEscrow(delivery.orderId);
      }
    }

    // Broadcast update via Socket.IO
    broadcastDeliveryUpdate(updatedDelivery);

    // Send email notifications (async, don't block response)
    if (status === 'delivered' || status === 'in_transit' || status === 'failed') {
      sendDeliveryUpdateNotification(updatedDelivery.order, updatedDelivery);

      // If completed, send order completion email
      if (status === 'delivered') {
        sendOrderCompletedNotification(updatedDelivery.order);
      }
    }

    res.status(200).json({
      message: 'Delivery status updated successfully',
      delivery: updatedDelivery,
    });
  } catch (error) {
    logger.error('Update delivery status error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to update delivery status',
      code: 'UPDATE_STATUS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Create delivery for an order (called internally when order is paid)
 */
exports.createDeliveryForOrder = async (orderId, pickupAddress, deliveryAddress) => {
  try {
    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        status: 'pending',
        pickupAddress,
        deliveryAddress,
      },
      include: {
        order: {
          include: {
            buyer: true,
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    logger.info('Delivery created for order', {
      orderId,
      deliveryId: delivery.id,
    });

    // Notify available couriers
    notifyAvailableDelivery(delivery);

    return delivery;
  } catch (error) {
    logger.error('Create delivery error:', { orderId, error: error.message });
    throw error;
  }
};

/**
 * Search deliveries with advanced filtering (admin only)
 * GET /api/admin/deliveries/search
 */
exports.searchDeliveries = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      status = '',
      courierId = '',
      buyerId = '',
      sellerId = '',
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

    // Text search across delivery and order details
    if (q) {
      where.OR = [
        { pickupAddress: { contains: q, mode: 'insensitive' } },
        { deliveryAddress: { contains: q, mode: 'insensitive' } },
        // Search in courier names
        {
          courier: {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        // Search in buyer/seller names and product titles
        {
          order: {
            OR: [
              {
                buyer: {
                  OR: [
                    { username: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
              {
                product: {
                  OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    {
                      seller: {
                        OR: [
                          { username: { contains: q, mode: 'insensitive' } },
                          { email: { contains: q, mode: 'insensitive' } },
                          { firstName: { contains: q, mode: 'insensitive' } },
                          { lastName: { contains: q, mode: 'insensitive' } },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    // Apply filters
    if (status) {
      const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'failed'];
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

    if (courierId) {
      where.courierId = courierId;
    }

    if (buyerId) {
      where.order = {
        buyerId,
      };
    }

    if (sellerId) {
      where.order = {
        ...where.order,
        product: {
          sellerId,
        },
      };
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Validate sort field
    const validSortFields = ['createdAt', 'updatedAt', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get deliveries with pagination
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderByField]: orderDirection },
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      username: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          courier: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              lastKnownLat: true,
              lastKnownLng: true,
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    // Get delivery analytics
    const deliveryAnalytics = await getDeliveryAnalytics(where);

    logger.info('Admin searched deliveries', {
      requestId: req.id,
      adminId: req.user.id,
      query: q,
      count: deliveries.length,
      total,
      filters: { status, courierId, buyerId, sellerId, dateFrom, dateTo },
    });

    res.json({
      query: q || null,
      items: deliveries,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + deliveries.length < total,
      },
      analytics: deliveryAnalytics,
      appliedFilters: {
        status: status || null,
        courierId: courierId || null,
        buyerId: buyerId || null,
        sellerId: sellerId || null,
        dateRange: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
      },
    });
  } catch (error) {
    logger.error('Search deliveries error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to search deliveries',
      code: 'SEARCH_DELIVERIES_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Get delivery analytics for search results
 * @param {Object} whereClause - Prisma where clause for filtering
 * @returns {Object} Analytics data
 */
const getDeliveryAnalytics = async (whereClause) => {
  try {
    const [
      totalDeliveries,
      deliveriesByStatus,
      averageDeliveryTime,
      onTimeDeliveryRate,
    ] = await Promise.all([
      prisma.delivery.count({ where: whereClause }),
      prisma.delivery.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      // Calculate average delivery time for completed deliveries
      prisma.delivery.aggregate({
        where: {
          ...whereClause,
          status: 'delivered',
          acceptedAt: { not: null },
          deliveredAt: { not: null },
        },
        _avg: {
          deliveredAt: true,
          acceptedAt: true,
        },
      }),
      // Calculate on-time delivery rate (simplified - deliveries completed within 7 days)
      prisma.delivery.count({
        where: {
          ...whereClause,
          status: 'delivered',
          deliveredAt: {
            lte: prisma.delivery.fields.acceptedAt + 7 * 24 * 60 * 60 * 1000, // 7 days in ms
          },
        },
      }).then(onTimeCount =>
        prisma.delivery.count({
          where: {
            ...whereClause,
            status: 'delivered',
          },
        }).then(totalDelivered =>
          totalDelivered > 0 ? ((onTimeCount / totalDelivered) * 100).toFixed(1) : 0
        )
      ),
    ]);

    return {
      overview: {
        totalDeliveries,
        onTimeDeliveryRate: `${onTimeDeliveryRate}%`,
      },
      byStatus: deliveriesByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
    };
  } catch (error) {
    logger.error('Get delivery analytics error:', { error: error.message });
    return null;
  }
};

module.exports = exports;
