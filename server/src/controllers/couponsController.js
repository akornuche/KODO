const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Get all coupons (admin only)
 * GET /api/coupons
 */
exports.getAllCoupons = async (req, res) => {
  try {
    const { active, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }

    // Since Coupon model doesn't exist yet, return mock data
    // In production, implement proper Coupon model
    const mockCoupons = [
      {
        id: '1',
        code: 'WELCOME10',
        description: '10% off your first order',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscount: 50,
        usageLimit: 100,
        usageCount: 25,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
        active: true,
      },
      {
        id: '2',
        code: 'SAVE20',
        description: '$20 off orders over $100',
        discountType: 'fixed',
        discountValue: 20,
        minOrderAmount: 100,
        maxDiscount: null,
        usageLimit: 50,
        usageCount: 10,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31'),
        active: true,
      },
    ];

    res.json({
      coupons: mockCoupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: mockCoupons.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  } catch (error) {
    logger.error('Get coupons error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to get coupons',
      code: 'GET_COUPONS_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Validate and apply coupon code
 * POST /api/coupons/validate
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user.id;

    if (!code || orderAmount === undefined) {
      return res.status(400).json({
        error: true,
        message: 'Coupon code and order amount are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    // Mock validation - in production, query Coupon model
    const mockCoupons = {
      'WELCOME10': {
        id: '1',
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscount: 50,
        active: true,
        validUntil: new Date('2025-12-31'),
      },
      'SAVE20': {
        id: '2',
        code: 'SAVE20',
        discountType: 'fixed',
        discountValue: 20,
        minOrderAmount: 100,
        maxDiscount: null,
        active: true,
        validUntil: new Date('2025-12-31'),
      },
    };

    const coupon = mockCoupons[code.toUpperCase()];

    if (!coupon) {
      return res.status(404).json({
        error: true,
        message: 'Invalid coupon code',
        code: 'INVALID_COUPON',
        requestId: req.id,
        valid: false,
      });
    }

    if (!coupon.active) {
      return res.status(400).json({
        error: true,
        message: 'Coupon is no longer active',
        code: 'COUPON_INACTIVE',
        requestId: req.id,
        valid: false,
      });
    }

    if (new Date() > coupon.validUntil) {
      return res.status(400).json({
        error: true,
        message: 'Coupon has expired',
        code: 'COUPON_EXPIRED',
        requestId: req.id,
        valid: false,
      });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        error: true,
        message: `Minimum order amount is $${coupon.minOrderAmount}`,
        code: 'MIN_ORDER_NOT_MET',
        requestId: req.id,
        valid: false,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    logger.info('Coupon validated', {
      requestId: req.id,
      userId,
      code,
      orderAmount,
      discountAmount,
      finalAmount,
    });

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      orderAmount,
      discountAmount,
      finalAmount,
      savings: discountAmount,
    });
  } catch (error) {
    logger.error('Validate coupon error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to validate coupon',
      code: 'VALIDATE_COUPON_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Create new coupon (admin only)
 * POST /api/coupons
 */
exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      validFrom,
      validUntil,
    } = req.body;

    // Validation
    if (!code || !discountType || !discountValue || !validUntil) {
      return res.status(400).json({
        error: true,
        message: 'Code, discount type, value, and expiry date are required',
        code: 'MISSING_FIELDS',
        requestId: req.id,
      });
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        error: true,
        message: 'Discount type must be percentage or fixed',
        code: 'INVALID_DISCOUNT_TYPE',
        requestId: req.id,
      });
    }

    // In production, create actual coupon in database
    const newCoupon = {
      id: Date.now().toString(),
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount,
      usageLimit,
      usageCount: 0,
      validFrom: validFrom || new Date(),
      validUntil: new Date(validUntil),
      active: true,
      createdAt: new Date(),
    };

    logger.info('Coupon created', {
      requestId: req.id,
      userId: req.user.id,
      code: newCoupon.code,
    });

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: newCoupon,
    });
  } catch (error) {
    logger.error('Create coupon error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to create coupon',
      code: 'CREATE_COUPON_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Update coupon (admin only)
 * PUT /api/coupons/:id
 */
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // In production, update actual coupon
    logger.info('Coupon updated', {
      requestId: req.id,
      userId: req.user.id,
      couponId: id,
      updates,
    });

    res.json({
      message: 'Coupon updated successfully',
      coupon: {
        id,
        ...updates,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Update coupon error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to update coupon',
      code: 'UPDATE_COUPON_ERROR',
      requestId: req.id,
    });
  }
};

/**
 * Deactivate coupon (admin only)
 * DELETE /api/coupons/:id
 */
exports.deactivateCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // In production, deactivate coupon
    logger.info('Coupon deactivated', {
      requestId: req.id,
      userId: req.user.id,
      couponId: id,
    });

    res.json({
      message: 'Coupon deactivated successfully',
      couponId: id,
    });
  } catch (error) {
    logger.error('Deactivate coupon error:', { 
      requestId: req.id, 
      error: error.message 
    });
    res.status(500).json({
      error: true,
      message: 'Failed to deactivate coupon',
      code: 'DEACTIVATE_COUPON_ERROR',
      requestId: req.id,
    });
  }
};

module.exports = exports;
