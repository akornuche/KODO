const prisma = require('../../config/db');

/**
 * Generate shipping label
 * @route POST /api/shipping-labels/generate
 */
const generateShippingLabel = async (req, res) => {
  try {
    const {
      orderId,
      carrier, // 'USPS', 'UPS', 'FedEx', 'DHL'
      serviceType, // 'standard', 'express', 'overnight'
      packageWeight,
      packageDimensions, // { length, width, height }
    } = req.body;

    // Verify order exists and user is seller
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        seller: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.sellerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate shipping cost based on weight and service
    const shippingRates = {
      USPS: { standard: 5.99, express: 12.99, overnight: 24.99 },
      UPS: { standard: 7.99, express: 15.99, overnight: 29.99 },
      FedEx: { standard: 8.99, express: 16.99, overnight: 31.99 },
      DHL: { standard: 9.99, express: 17.99, overnight: 34.99 },
    };

    const baseRate = shippingRates[carrier]?.[serviceType] || 5.99;
    const weightSurcharge = packageWeight > 5 ? (packageWeight - 5) * 1.5 : 0;
    const totalShippingCost = baseRate + weightSurcharge;

    // Generate tracking number
    const trackingNumber = `${carrier.substring(0, 2)}${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create shipping label data
    const label = {
      id: Date.now().toString(),
      orderId,
      trackingNumber,
      carrier,
      serviceType,
      shippingCost: totalShippingCost,
      packageWeight,
      packageDimensions,
      from: {
        name: order.seller.name,
        address: order.seller.address || 'Seller address not available',
        phone: order.seller.phone,
      },
      to: {
        name: order.buyer.name,
        address: order.shippingAddress,
        phone: order.buyer.phone,
      },
      barcodeData: trackingNumber,
      labelUrl: `https://kodo-labels.s3.amazonaws.com/${trackingNumber}.pdf`, // Mock URL
      createdAt: new Date(),
      estimatedDelivery: new Date(Date.now() + (serviceType === 'overnight' ? 1 : serviceType === 'express' ? 3 : 7) * 24 * 60 * 60 * 1000),
    };

    // Update order with tracking info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'shipped',
        updatedAt: new Date(),
      },
    });

    // Create or update delivery record
    const delivery = await prisma.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        trackingNumber,
        status: 'in_transit',
        estimatedDelivery: label.estimatedDelivery,
        carrier,
      },
      update: {
        trackingNumber,
        status: 'in_transit',
        estimatedDelivery: label.estimatedDelivery,
        carrier,
        pickedUpAt: new Date(),
      },
    });

    // Send notification to buyer
    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: 'order_shipped',
        title: 'Order Shipped',
        message: `Your order has been shipped. Tracking: ${trackingNumber}`,
        relatedId: orderId,
      },
    }).catch(err => console.error('Notification creation failed:', err));

    res.status(201).json({
      message: 'Shipping label generated successfully',
      label,
      delivery,
    });
  } catch (error) {
    console.error('Generate shipping label error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get shipping label
 * @route GET /api/shipping-labels/:orderId
 */
const getShippingLabel = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        delivery: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify user is seller or buyer
    if (order.sellerId !== req.user.id && order.buyerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!order.delivery?.trackingNumber) {
      return res.status(404).json({ message: 'Shipping label not yet generated' });
    }

    res.json({
      orderId: order.id,
      trackingNumber: order.delivery.trackingNumber,
      carrier: order.delivery.carrier,
      status: order.delivery.status,
      estimatedDelivery: order.delivery.estimatedDelivery,
      labelUrl: `https://kodo-labels.s3.amazonaws.com/${order.delivery.trackingNumber}.pdf`,
    });
  } catch (error) {
    console.error('Get shipping label error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get carrier rates
 * @route POST /api/shipping-labels/rates
 */
const getCarrierRates = async (req, res) => {
  try {
    const { weight, dimensions, fromZip, toZip } = req.body;

    // Calculate rates for all carriers
    const rates = [
      {
        carrier: 'USPS',
        services: [
          { type: 'standard', name: 'USPS Ground', cost: 5.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '5-7' },
          { type: 'express', name: 'USPS Priority', cost: 12.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '2-3' },
          { type: 'overnight', name: 'USPS Express', cost: 24.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '1' },
        ],
      },
      {
        carrier: 'UPS',
        services: [
          { type: 'standard', name: 'UPS Ground', cost: 7.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '5-7' },
          { type: 'express', name: 'UPS 2nd Day', cost: 15.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '2' },
          { type: 'overnight', name: 'UPS Next Day', cost: 29.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '1' },
        ],
      },
      {
        carrier: 'FedEx',
        services: [
          { type: 'standard', name: 'FedEx Ground', cost: 8.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '5-7' },
          { type: 'express', name: 'FedEx 2Day', cost: 16.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '2' },
          { type: 'overnight', name: 'FedEx Overnight', cost: 31.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '1' },
        ],
      },
      {
        carrier: 'DHL',
        services: [
          { type: 'standard', name: 'DHL Ground', cost: 9.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '5-7' },
          { type: 'express', name: 'DHL Express', cost: 17.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '2-3' },
          { type: 'overnight', name: 'DHL Overnight', cost: 34.99 + (weight > 5 ? (weight - 5) * 1.5 : 0), days: '1' },
        ],
      },
    ];

    res.json({ rates });
  } catch (error) {
    console.error('Get carrier rates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Void shipping label
 * @route DELETE /api/shipping-labels/:orderId
 */
const voidShippingLabel = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.sellerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!order.delivery) {
      return res.status(404).json({ message: 'No shipping label to void' });
    }

    // Can only void if not yet picked up
    if (order.delivery.status !== 'pending' && order.delivery.status !== 'in_transit') {
      return res.status(400).json({ message: 'Cannot void label after pickup' });
    }

    await prisma.delivery.update({
      where: { orderId },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'processing',
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Shipping label voided successfully' });
  } catch (error) {
    console.error('Void shipping label error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  generateShippingLabel,
  getShippingLabel,
  getCarrierRates,
  voidShippingLabel,
};
