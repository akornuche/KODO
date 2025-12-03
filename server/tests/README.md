# Backend Testing Guide

This directory contains all backend tests for the KODO application.

## Test Structure

```
tests/
├── setup.js                 # Global test setup
├── helpers/
│   ├── testUtils.js         # Test utilities and helper functions
│   ├── mocks.js             # Mock implementations for external services
│   └── testDb.js            # Test database configuration
├── integration/             # API integration tests
│   ├── auth.test.js
│   ├── products.test.js
│   ├── bids.test.js
│   ├── orders.test.js
│   └── ...
└── unit/                    # Unit tests
    ├── controllers/
    ├── services/
    └── utils/
```

## Setup

### 1. Install Dependencies

```bash
npm install -D jest supertest @types/jest @types/supertest cross-env
```

### 2. Create Test Database

Before running tests, create a separate test database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE kododb_test;
```

### 3. Run Migrations on Test Database

```bash
# Set DATABASE_URL to test database temporarily
$env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
npx prisma migrate deploy
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Unit Tests Only
```bash
npm run test:unit
```

## Writing Tests

### Integration Test Example

```javascript
const request = require('supertest');
const { app } = require('../../app');
const { generateToken, createTestUser, cleanupTestData } = require('../helpers/testUtils');

describe('API Endpoint', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  it('should do something', async () => {
    const user = await createTestUser();
    const token = generateToken(user.id);

    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Unit Test Example

```javascript
const someFunction = require('../../src/utils/someFunction');

describe('someFunction', () => {
  it('should return expected result', () => {
    const result = someFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

## Test Utilities

### `testUtils.js`

- `generateToken(userId, role)` - Generate JWT for testing
- `createTestUser(overrides)` - Create a test user
- `createTestProduct(sellerId, overrides)` - Create a test product
- `createTestBid(productId, buyerId, overrides)` - Create a test bid
- `createTestOrder(productId, buyerId, sellerId, overrides)` - Create a test order
- `cleanupTestData()` - Clean up all test data
- `disconnectPrisma()` - Disconnect Prisma client

### `mocks.js`

- `mockStripe` - Mock Stripe payment service
- `mockMailTransporter` - Mock email service
- `mockSocket` / `mockIo` - Mock Socket.IO
- `mockMulterFile` - Mock file upload
- `mockSharp` - Mock image processing
- `mockLogger` - Mock Winston logger
- `resetAllMocks()` - Reset all mock functions

## Coverage Goals

- **Overall**: 80%+ coverage
- **Integration Tests**: Cover all API endpoints
- **Unit Tests**: 85%+ coverage for business logic
- **Critical Paths**: 100% coverage for authentication, payments, and security

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Mocking**: Mock external services (Stripe, emails, etc.)
4. **Descriptive**: Use clear test descriptions
5. **Fast**: Keep tests fast by using transactions where possible
6. **Assertions**: Use meaningful assertions with clear error messages

## Troubleshooting

### Tests Hanging
- Ensure `forceExit: true` in jest.config.js
- Call `disconnectPrisma()` in afterAll hooks

### Database Errors
- Verify test database exists and is accessible
- Check DATABASE_URL in .env.test
- Ensure migrations are up to date

### Token Errors
- Verify JWT_SECRET is set in test environment
- Check token generation in testUtils.js

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://user:pass@localhost:5432/test_db
```
