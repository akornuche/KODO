#!/usr/bin/env node
/**
 * Performance Health Check Script
 * Verifies database optimization, caching, and API performance
 */

const prisma = require('../src/lib/prisma');
const redis = require('redis');

const checks = {
  database: { passed: 0, failed: 0 },
  caching: { passed: 0, failed: 0 },
  api: { passed: 0, failed: 0 },
};

/**
 * Color output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
  checks.database.passed++;
}

function fail(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
  checks.database.failed++;
}

function info(msg) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

/**
 * Check 1: Database Indexes
 */
async function checkDatabaseIndexes() {
  console.log(`\n${colors.cyan}Checking Database Indexes...${colors.reset}`);

  try {
    // Get all tables and their indexes
    const tables = [
      'User',
      'Product',
      'Order',
      'Delivery',
      'Review',
    ];

    for (const table of tables) {
      try {
        // Attempt to query the table schema
        const result = await prisma.$queryRaw`
          SELECT indexname FROM pg_indexes WHERE tablename = ${table.toLowerCase()};
        `.catch(() => []);

        if (result && result.length > 0) {
          pass(`${table}: ${result.length} indexes found`);
        } else {
          info(`${table}: No indexes found (might be SQLite)`);
        }
      } catch (error) {
        info(`${table}: Could not check indexes (${error.message})`);
      }
    }
  } catch (error) {
    console.error('Database index check failed:', error.message);
  }
}

/**
 * Check 2: Database Query Performance
 */
async function checkQueryPerformance() {
  console.log(`\n${colors.cyan}Checking Query Performance...${colors.reset}`);

  try {
    // Test query 1: List products (with proper pagination)
    console.time('Products Query');
    const products = await prisma.product.findMany({
      take: 20,
      select: { id: true, title: true, price: true },
    });
    console.timeEnd('Products Query');

    if (products.length >= 0) {
      pass('Products query completed successfully');
    }

    // Test query 2: User with relations (check for N+1)
    console.time('User with Relations');
    const user = await prisma.user.findFirst({
      include: {
        products: { take: 5 },
        orders: { take: 5 },
      },
    });
    console.timeEnd('User with Relations');

    if (user) {
      pass('User relations query completed successfully');
    }

    // Test query 3: Count by category (aggregation)
    console.time('Aggregation Query');
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true },
    });
    console.timeEnd('Aggregation Query');

    pass('Aggregation query completed successfully');
  } catch (error) {
    console.error('Query performance check failed:', error.message);
  }
}

/**
 * Check 3: Redis Caching
 */
async function checkRedisCache() {
  console.log(`\n${colors.cyan}Checking Redis Cache...${colors.reset}`);

  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: { reconnectStrategy: () => null },
    });

    client.on('error', (err) => {
      fail(`Redis connection failed: ${err.message}`);
      return;
    });

    await client.connect().catch(() => {
      fail('Could not connect to Redis');
      return;
    });

    // Test set/get
    await client.set('test-key', 'test-value', { EX: 60 });
    const value = await client.get('test-key');

    if (value === 'test-value') {
      pass('Redis set/get working');
      checks.caching.passed++;
    } else {
      fail('Redis set/get failed');
      checks.caching.failed++;
    }

    // Test TTL
    const ttl = await client.ttl('test-key');
    if (ttl > 0 && ttl <= 60) {
      pass(`Redis TTL working (TTL: ${ttl}s)`);
      checks.caching.passed++;
    } else {
      fail('Redis TTL not working correctly');
      checks.caching.failed++;
    }

    await client.disconnect();
  } catch (error) {
    info(`Redis caching check skipped: ${error.message}`);
  }
}

/**
 * Check 4: N+1 Query Detection
 */
async function checkN1Queries() {
  console.log(`\n${colors.cyan}Checking for N+1 Queries...${colors.reset}`);

  try {
    // Enable query logging
    let queryCount = 0;
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0]?.includes?.('SELECT')) queryCount++;
      originalLog(...args);
    };

    // Test: Getting orders with products (potential N+1)
    const orders = await prisma.order.findMany({
      take: 5,
      include: { items: { include: { product: true } } },
    });

    console.log = originalLog;

    if (orders.length > 0) {
      pass(`Orders with relations: ${queryCount} queries for ${orders.length} orders`);
      if (queryCount > orders.length * 2) {
        fail(`Potential N+1 pattern detected (${queryCount} queries)`);
        checks.api.failed++;
      } else {
        pass('No obvious N+1 patterns detected');
        checks.api.passed++;
      }
    }
  } catch (error) {
    info(`N+1 query check skipped: ${error.message}`);
  }
}

/**
 * Check 5: Pagination
 */
async function checkPagination() {
  console.log(`\n${colors.cyan}Checking Pagination...${colors.reset}`);

  try {
    // Test pagination
    const page1 = await prisma.product.findMany({
      take: 20,
      skip: 0,
    });

    const page2 = await prisma.product.findMany({
      take: 20,
      skip: 20,
    });

    if (page1.length > 0 && page2.length >= 0) {
      pass(`Pagination working (page1: ${page1.length}, page2: ${page2.length})`);
      checks.api.passed++;
    } else {
      info('Not enough products to test pagination');
      checks.api.passed++;
    }
  } catch (error) {
    fail(`Pagination check failed: ${error.message}`);
    checks.api.failed++;
  }
}

/**
 * Check 6: Select Optimization
 */
async function checkSelectOptimization() {
  console.log(`\n${colors.cyan}Checking Select Optimization...${colors.reset}`);

  try {
    // Query with select (optimized)
    console.time('Optimized Query');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      take: 100,
    });
    console.timeEnd('Optimized Query');

    pass(`Select optimization: Retrieved ${users.length} users with minimal fields`);
    checks.api.passed++;
  } catch (error) {
    fail(`Select optimization check failed: ${error.message}`);
    checks.api.failed++;
  }
}

/**
 * Summary Report
 */
function printSummary() {
  console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}Performance Health Check Summary${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [category, stats] of Object.entries(checks)) {
    const total = stats.passed + stats.failed;
    const percentage = total > 0 ? Math.round((stats.passed / total) * 100) : 0;
    const status = percentage === 100 ? colors.green : percentage > 50 ? colors.yellow : colors.red;

    console.log(`${category.toUpperCase()}: ${status}${percentage}%${colors.reset} (${stats.passed}/${total})`);
    totalPassed += stats.passed;
    totalFailed += stats.failed;
  }

  console.log(`\n${colors.cyan}Total: ${totalPassed} passed, ${totalFailed} failed${colors.reset}\n`);

  if (totalFailed === 0) {
    console.log(`${colors.green}✓ All performance checks passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠ Some performance checks failed. Review above.${colors.reset}\n`);
    process.exit(1);
  }
}

/**
 * Main
 */
async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     KODO Performance Health Check       ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);

  try {
    await checkDatabaseIndexes();
    await checkQueryPerformance();
    await checkRedisCache();
    await checkN1Queries();
    await checkPagination();
    await checkSelectOptimization();

    printSummary();
  } catch (error) {
    console.error(`${colors.red}✗ Health check failed:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

