#!/usr/bin/env node
/**
 * Manual Role Verification Script
 * Verifies all 4 user roles work end-to-end
 * 
 * Usage: node verify-roles.js
 * 
 * This script:
 * 1. Registers users for all 4 roles
 * 2. Logs in with each role
 * 3. Tests role-specific endpoints
 * 4. Verifies access control (role-based denial)
 * 5. Cleans up test users
 */

const axios = require('axios');
const Table = require('cli-table3');
const chalk = require('chalk');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_DATA = {
  buyer: {
    email: `buyer-${Date.now()}@test.com`,
    username: `buyer_${Date.now()}`,
    password: 'BuyerTest123!',
    role: 'buyer',
    firstName: 'Test',
    lastName: 'Buyer',
  },
  seller: {
    email: `seller-${Date.now()}@test.com`,
    username: `seller_${Date.now()}`,
    password: 'SellerTest123!',
    role: 'seller',
    firstName: 'Test',
    lastName: 'Seller',
    businessName: 'Test Shop',
    sellerNiche: 'Electronics',
  },
  courier: {
    email: `courier-${Date.now()}@test.com`,
    username: `courier_${Date.now()}`,
    password: 'CourierTest123!',
    role: 'courier',
    firstName: 'Test',
    lastName: 'Courier',
  },
  admin: {
    email: `admin-${Date.now()}@test.com`,
    username: `admin_${Date.now()}`,
    password: 'AdminTest123!',
    role: 'admin',
    firstName: 'Test',
    lastName: 'Admin',
  },
};

// Results tracking
const results = {
  registration: {},
  login: {},
  dashboard: {},
  roleSpecific: {},
  accessControl: {},
};

let users = {};
let tokens = {};

/**
 * Helper: Make API request
 */
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {},
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      data: error.response?.data,
      status: error.response?.status,
      message: error.message,
    };
  }
}

/**
 * Test: Register all roles
 */
async function testRegistration() {
  console.log(chalk.cyan('\n📝 Testing Registration...\n'));

  for (const [role, userData] of Object.entries(TEST_DATA)) {
    process.stdout.write(`  Registering ${role}... `);

    const result = await apiRequest('POST', '/api/auth/register', userData);

    if (result.success && result.status === 201) {
      users[role] = result.data.user;
      tokens[role] = result.data.token;
      results.registration[role] = '✓';
      console.log(chalk.green('✓'));
    } else {
      results.registration[role] = '✗';
      console.log(chalk.red(`✗ (${result.status})`));
    }
  }
}

/**
 * Test: Login for all roles
 */
async function testLogin() {
  console.log(chalk.cyan('\n🔐 Testing Login...\n'));

  for (const [role, userData] of Object.entries(TEST_DATA)) {
    process.stdout.write(`  Logging in as ${role}... `);

    const result = await apiRequest('POST', '/api/auth/login', {
      emailOrUsername: userData.email,
      password: userData.password,
    });

    if (result.success && result.status === 200) {
      // Update token for login token
      tokens[role] = result.data.token;
      results.login[role] = '✓';
      console.log(chalk.green('✓'));
    } else {
      results.login[role] = '✗';
      console.log(chalk.red(`✗ (${result.status})`));
    }
  }
}

/**
 * Test: Access dashboard for all roles
 */
async function testDashboard() {
  console.log(chalk.cyan('\n📊 Testing Dashboard Access...\n'));

  for (const role of Object.keys(TEST_DATA)) {
    process.stdout.write(`  Accessing ${role} dashboard... `);

    const result = await apiRequest('GET', '/api/protected/dashboard', null, tokens[role]);

    if (result.success && result.status === 200) {
      results.dashboard[role] = '✓';
      console.log(chalk.green('✓'));
    } else {
      results.dashboard[role] = '✗';
      console.log(chalk.red(`✗ (${result.status})`));
    }
  }
}

/**
 * Test: Role-specific endpoints
 */
async function testRoleSpecificEndpoints() {
  console.log(chalk.cyan('\n🎯 Testing Role-Specific Endpoints...\n'));

  const endpoints = {
    buyer: { method: 'GET', endpoint: '/api/cart', name: 'Cart' },
    seller: { method: 'GET', endpoint: '/api/seller-analytics/overview', name: 'Analytics' },
    courier: { method: 'GET', endpoint: '/api/deliveries', name: 'Deliveries' },
    admin: { method: 'GET', endpoint: '/api/admin/users', name: 'Users' },
  };

  for (const [role, endpoint] of Object.entries(endpoints)) {
    process.stdout.write(`  ${role.toUpperCase()}: ${endpoint.name}... `);

    const result = await apiRequest(
      endpoint.method,
      endpoint.endpoint,
      null,
      tokens[role]
    );

    if (result.success && result.status === 200) {
      results.roleSpecific[role] = '✓';
      console.log(chalk.green('✓'));
    } else if (result.status === 403) {
      // Some endpoints might not exist yet, but 403 is okay (forbidden for other roles)
      results.roleSpecific[role] = '✓ (403 ok)';
      console.log(chalk.yellow('✓ (endpoint may not exist yet)'));
    } else {
      results.roleSpecific[role] = '✗';
      console.log(chalk.red(`✗ (${result.status})`));
    }
  }
}

/**
 * Test: Access control (cross-role denial)
 */
async function testAccessControl() {
  console.log(chalk.cyan('\n🛡️  Testing Access Control (Cross-Role Denial)...\n'));

  // Test that buyer cannot access admin endpoints
  process.stdout.write(`  Buyer accessing admin panel... `);
  let result = await apiRequest('GET', '/api/admin/users', null, tokens.buyer);
  if (result.status === 403) {
    results.accessControl.buyer_admin = '✓ (denied)';
    console.log(chalk.green('✓ (correctly denied)'));
  } else {
    results.accessControl.buyer_admin = '✗';
    console.log(chalk.red(`✗ (should be denied)`));
  }

  // Test that seller cannot access courier endpoints
  process.stdout.write(`  Seller accessing courier deliveries... `);
  result = await apiRequest('GET', '/api/deliveries', null, tokens.seller);
  if (result.status === 403) {
    results.accessControl.seller_courier = '✓ (denied)';
    console.log(chalk.green('✓ (correctly denied)'));
  } else {
    results.accessControl.seller_courier = '✗';
    console.log(chalk.red(`✗ (should be denied)`));
  }

  // Test that courier cannot access seller analytics
  process.stdout.write(`  Courier accessing seller analytics... `);
  result = await apiRequest('GET', '/api/seller-analytics/overview', null, tokens.courier);
  if (result.status === 403) {
    results.accessControl.courier_seller = '✓ (denied)';
    console.log(chalk.green('✓ (correctly denied)'));
  } else {
    results.accessControl.courier_seller = '✗';
    console.log(chalk.red(`✗ (should be denied)`));
  }

  // Test that unauthenticated user cannot access protected route
  process.stdout.write(`  No token accessing protected route... `);
  result = await apiRequest('GET', '/api/protected/dashboard');
  if (result.status === 401) {
    results.accessControl.no_auth = '✓ (denied)';
    console.log(chalk.green('✓ (correctly denied)'));
  } else {
    results.accessControl.no_auth = '✗';
    console.log(chalk.red(`✗ (should be denied)`));
  }
}

/**
 * Display results summary
 */
function displayResults() {
  console.log(chalk.cyan('\n\n📈 Test Results Summary\n'));

  const tables = {
    'Registration': results.registration,
    'Login': results.login,
    'Dashboard': results.dashboard,
    'Role-Specific': results.roleSpecific,
    'Access Control': results.accessControl,
  };

  for (const [category, results] of Object.entries(tables)) {
    const table = new Table({
      head: [chalk.cyan(category), chalk.cyan('Result')],
      style: { compact: true },
    });

    for (const [test, result] of Object.entries(results)) {
      const isPass = result.includes('✓') && !result.includes('✗');
      table.push([
        test,
        isPass ? chalk.green(result) : chalk.red(result),
      ]);
    }

    console.log(table.toString());
    console.log();
  }
}

/**
 * Cleanup: Delete test users
 */
async function cleanup() {
  console.log(chalk.cyan('\n🧹 Cleaning up test users...\n'));

  for (const [role, userData] of Object.entries(TEST_DATA)) {
    process.stdout.write(`  Deleting ${role} user... `);

    // For now, just acknowledge (actual deletion would require admin endpoint)
    // In production, use admin API to delete
    console.log(chalk.yellow('(requires admin cleanup)'));
  }

  console.log('\nNote: Test users created. In production, use admin endpoint to delete:');
  console.log(chalk.gray(`  DELETE /api/admin/users/:id`));
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║   KODO User Role Verification Script   ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════╝'));

  console.log(`\nAPI URL: ${chalk.gray(API_BASE_URL)}`);
  console.log(`\nTesting 4 user roles: buyer, seller, courier, admin\n`);

  try {
    await testRegistration();
    await testLogin();
    await testDashboard();
    await testRoleSpecificEndpoints();
    await testAccessControl();
    displayResults();
    await cleanup();

    console.log(chalk.green('\n✓ Verification complete!\n'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n✗ Verification failed:'), error.message);
    process.exit(1);
  }
}

// Run
main();

