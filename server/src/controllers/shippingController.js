const shippingCalculator = require('../lib/shippingCalculator');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Calculate shipping cost
 * POST /api/shipping/calculate
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { fromLocation, toLocation, weight, shippingMethod, orderValue } = req.body;

    // Validate inputs
    if (!fromLocation || !toLocation || !weight) {
      return res.status(400).json({
        error: true,
        message: 'fromLocation, toLocation, and weight are required',
        code: 'MISSING_PARAMETERS',
        requestId: req.id,
      });
    }

    // Calculate distance
    const distance = shippingCalculator.calculateDistance(fromLocation, toLocation);

    let result;

    if (shippingMethod) {
      // Calculate for specific method
      result = shippingCalculator.calculateShippingCost({
        distance,
        weight,
        shippingMethod,
      });
    } else {
      // Get all available options
      result = shippingCalculator.getAvailableShippingOptions({
        distance,
        weight,
        orderValue: orderValue || 0,
      });
    }

    logger.info('Shipping calculated', {
      requestId: req.id,
      userId: req.user?.id,
      distance,
      weight,
      method: shippingMethod || 'all',
    });

    res.json({
      distance,
      weight,
      ...(Array.isArray(result) ? { options: result } : { ...result }),
    });
  } catch (error) {
    logger.error('Calculate shipping error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to calculate shipping',
      code: 'CALCULATE_SHIPPING_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

/**
 * Get available shipping options
 * GET /api/shipping/options
 */
exports.getShippingOptions = async (req, res) => {
  try {
    const { distance, weight, orderValue } = req.query;

    if (!distance || !weight) {
      return res.status(400).json({
        error: true,
        message: 'distance and weight query parameters are required',
        code: 'MISSING_PARAMETERS',
        requestId: req.id,
      });
    }

    const options = shippingCalculator.getAvailableShippingOptions({
      distance: parseFloat(distance),
      weight: parseFloat(weight),
      orderValue: parseFloat(orderValue) || 0,
    });

    res.json({
      distance: parseFloat(distance),
      weight: parseFloat(weight),
      options,
      count: options.length,
    });
  } catch (error) {
    logger.error('Get shipping options error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to get shipping options',
      code: 'GET_OPTIONS_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

/**
 * Validate shipping address
 * POST /api/shipping/validate-address
 */
exports.validateAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: true,
        message: 'address is required',
        code: 'MISSING_ADDRESS',
        requestId: req.id,
      });
    }

    const validation = shippingCalculator.validateAddress(address);

    if (!validation.valid) {
      return res.status(400).json({
        error: true,
        message: 'Address validation failed',
        code: 'INVALID_ADDRESS',
        errors: validation.errors,
        requestId: req.id,
      });
    }

    res.json({
      valid: true,
      message: 'Address is valid',
      address,
    });
  } catch (error) {
    logger.error('Validate address error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to validate address',
      code: 'VALIDATE_ADDRESS_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

/**
 * Calculate distance between two coordinates
 * GET /api/shipping/distance
 */
exports.calculateDistance = async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: true,
        message: 'fromLat, fromLng, toLat, and toLng are required',
        code: 'MISSING_COORDINATES',
        requestId: req.id,
      });
    }

    const distance = shippingCalculator.calculateDistance(
      { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      { lat: parseFloat(toLat), lng: parseFloat(toLng) }
    );

    res.json({
      distance,
      unit: 'km',
      from: { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      to: { lat: parseFloat(toLat), lng: parseFloat(toLng) },
    });
  } catch (error) {
    logger.error('Calculate distance error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to calculate distance',
      code: 'CALCULATE_DISTANCE_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

/**
 * Generate tracking number for order
 * POST /api/shipping/generate-tracking
 */
exports.generateTracking = async (req, res) => {
  try {
    const { orderId, shippingMethod } = req.body;

    if (!orderId || !shippingMethod) {
      return res.status(400).json({
        error: true,
        message: 'orderId and shippingMethod are required',
        code: 'MISSING_PARAMETERS',
        requestId: req.id,
      });
    }

    // Verify order exists and user has permission
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId: req.id,
      });
    }

    // Only seller or admin can generate tracking
    if (req.user.role !== 'admin' && req.user.id !== order.product.sellerId) {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized to generate tracking for this order',
        code: 'UNAUTHORIZED',
        requestId: req.id,
      });
    }

    const trackingNumber = shippingCalculator.generateTrackingNumber(orderId, shippingMethod);

    // Update order with tracking number
    await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        shippingMethod,
        status: 'shipped',
      },
    });

    logger.info('Tracking number generated', {
      requestId: req.id,
      userId: req.user.id,
      orderId,
      trackingNumber,
    });

    res.json({
      message: 'Tracking number generated successfully',
      trackingNumber,
      shippingMethod,
      orderId,
    });
  } catch (error) {
    logger.error('Generate tracking error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to generate tracking number',
      code: 'GENERATE_TRACKING_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

/**
 * Estimate delivery date
 * GET /api/shipping/estimate-delivery
 */
exports.estimateDelivery = async (req, res) => {
  try {
    const { businessDays } = req.query;

    if (!businessDays) {
      return res.status(400).json({
        error: true,
        message: 'businessDays query parameter is required',
        code: 'MISSING_PARAMETER',
        requestId: req.id,
      });
    }

    const estimatedDate = shippingCalculator.estimateDeliveryDate(parseInt(businessDays));

    res.json({
      businessDays: parseInt(businessDays),
      estimatedDelivery: estimatedDate.toISOString().split('T')[0],
      estimatedDeliveryFull: estimatedDate.toISOString(),
    });
  } catch (error) {
    logger.error('Estimate delivery error:', { requestId: req.id, error: error.message });
    res.status(500).json({
      error: true,
      message: 'Failed to estimate delivery date',
      code: 'ESTIMATE_DELIVERY_ERROR',
      details: error.message,
      requestId: req.id,
    });
  }
};

module.exports = exports;
