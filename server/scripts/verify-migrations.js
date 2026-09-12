#!/usr/bin/env node
/**
 * Verify Database Migrations
 * Checks that all required tables and migrations are in place
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const chalk = require('chalk');

async function verifyMigrations() {
  console.log('\n' + chalk.bold('🔍 Verifying Database Migrations\n'));

  const checks = [];

  try {
    // Test database connection
    console.log(chalk.gray('  Testing database connection...'));
    await prisma.$queryRaw`SELECT 1`;
    console.log(chalk.green('  ✓ Database connection successful\n'));

    // List of critical tables that must exist
    const requiredTables = [
      'User',
      'Product',
      'Order',
      'Delivery',
      'Bid',
      'UserSettings',
      'Address',
      'Payment',
    ];

    console.log(chalk.gray('  Checking required tables:\n'));

    for (const table of requiredTables) {
      try {
        // Try to query the table
        await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
        console.log(chalk.green(`    ✓ ${table}`));
        checks.push({ table, status: 'ok' });
      } catch (error) {
        console.log(chalk.red(`    ✗ ${table}`));
        checks.push({ table, status: 'missing', error: error.message });
      }
    }

    // Check user count
    console.log(chalk.gray('\n  Checking data:\n'));
    const userCount = await prisma.user.count();
    console.log(chalk.blue(`    Users: ${userCount}`));

    const productCount = await prisma.product.count();
    console.log(chalk.blue(`    Products: ${productCount}`));

    const orderCount = await prisma.order.count();
    console.log(chalk.blue(`    Orders: ${orderCount}`));

    // Check migrations status
    console.log(chalk.gray('\n  Migration history:\n'));
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `;

    if (migrations && migrations.length > 0) {
      migrations.forEach((m) => {
        const date = new Date(m.finished_at).toLocaleString();
        console.log(chalk.blue(`    ✓ ${m.migration_name} (${date})`));
      });
    } else {
      console.log(chalk.yellow('    No migrations found'));
    }

    // Summary
    const failedChecks = checks.filter((c) => c.status !== 'ok');

    console.log('\n' + chalk.bold('Summary:\n'));

    if (failedChecks.length === 0) {
      console.log(chalk.green.bold('  ✅ All checks passed! Database is ready for production.\n'));
      return true;
    } else {
      console.log(chalk.red.bold(`  ❌ ${failedChecks.length} check(s) failed:\n`));
      failedChecks.forEach((check) => {
        console.log(chalk.red(`    • ${check.table}: ${check.error}`));
      });
      console.log('\n  Run: npm run db:migrate\n');
      return false;
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Verification failed:\n'), error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyMigrations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

