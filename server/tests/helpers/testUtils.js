const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate JWT token for testing
 */
const generateToken = (userId, role = 'buyer') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

/**
 * Create test user
 */
const createTestUser = async (overrides = {}) => {
  const bcrypt = require('bcryptjs');
  const defaultPassword = await bcrypt.hash('password123', 10);

  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: defaultPassword,
    role: 'buyer',
    ...overrides
  };

  return await prisma.user.create({
    data: userData
  });
};

/**
 * Create test product
 */
const createTestProduct = async (sellerId, overrides = {}) => {
  const productData = {
    title: `Test Product ${Date.now()}`,
    description: 'Test product description',
    category: 'Electronics',
    condition: 'new',
    price: 100.00,
    sellerId,
    status: 'active',
    ...overrides
  };

  return await prisma.product.create({
    data: productData
  });
};

/**
 * Create test bid
 */
const createTestBid = async (productId, buyerId, overrides = {}) => {
  const bidData = {
    productId,
    buyerId,
    budget: 80.00,
    description: 'Test bid description',
    status: 'pending',
    ...overrides
  };

  return await prisma.bid.create({
    data: bidData
  });
};

/**
 * Create test order
 */
const createTestOrder = async (productId, buyerId, sellerId, overrides = {}) => {
  const orderData = {
    productId,
    buyerId,
    sellerId,
    totalAmount: 100.00,
    platformFee: 5.00,
    status: 'pending',
    ...overrides
  };

  return await prisma.order.create({
    data: orderData
  });
};

/**
 * Create test delivery
 */
const createTestDelivery = async (orderId, overrides = {}) => {
  const deliveryData = {
    orderId,
    pickupLocation: 'Test Pickup Location',
    deliveryLocation: 'Test Delivery Location',
    deliveryFee: 10.00,
    status: 'pending',
    ...overrides
  };

  return await prisma.delivery.create({
    data: deliveryData
  });
};

/**
 * Clean up test data
 */
const cleanupTestData = async () => {
  // Delete in order to respect foreign key constraints
  await prisma.review.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.bid.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
};

/**
 * Disconnect Prisma client
 */
const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

module.exports = {
  prisma,
  generateToken,
  createTestUser,
  createTestProduct,
  createTestBid,
  createTestOrder,
  createTestDelivery,
  cleanupTestData,
  disconnectPrisma
};
