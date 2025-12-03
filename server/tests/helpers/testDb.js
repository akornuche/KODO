/**
 * Test Database Configuration
 * 
 * This file handles test database setup and teardown
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

/**
 * Setup test database
 * Runs migrations and prepares the database for testing
 */
const setupTestDatabase = async () => {
  try {
    console.log('Setting up test database...');
    
    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit'
    });

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

/**
 * Teardown test database
 * Cleans up all data and closes connections
 */
const teardownTestDatabase = async () => {
  try {
    console.log('Tearing down test database...');
    
    // Delete all data
    await prisma.review.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.dispute.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    await prisma.$disconnect();
    
    console.log('Test database teardown complete');
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

/**
 * Reset test database
 * Clears all data but keeps the schema
 */
const resetTestDatabase = async () => {
  try {
    await prisma.review.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.dispute.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    console.error('Error resetting test database:', error);
    throw error;
  }
};

module.exports = {
  prisma,
  setupTestDatabase,
  teardownTestDatabase,
  resetTestDatabase
};
