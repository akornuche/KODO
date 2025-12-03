# Test Database Setup Guide

## Overview

The KODO backend uses a separate PostgreSQL database for testing to ensure tests don't interfere with development data.

## Prerequisites

- PostgreSQL 15 or higher installed and running
- Development database already set up
- Node.js and npm installed

## Setup Steps

### 1. Create Test Database

Connect to PostgreSQL and create the test database:

```bash
# Windows (PowerShell)
psql -U postgres

# Once connected to psql:
CREATE DATABASE kododb_test;
GRANT ALL PRIVILEGES ON DATABASE kododb_test TO kodo_user;
\q
```

### 2. Configure Environment

The `.env.test` file is already configured with test database settings:

```env
DATABASE_URL=postgresql://kodo_user:kodo_password@localhost:5432/kododb_test
```

### 3. Run Migrations on Test Database

Apply all migrations to the test database:

```bash
# Windows (PowerShell)
$env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
npx prisma migrate deploy
```

Alternatively, you can use the development migrations:

```bash
# Copy migration history from dev to test
$env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
npx prisma migrate deploy
```

### 4. Verify Setup

Test the database connection:

```bash
# Run a simple test
npm test -- --testPathPattern=auth.test.js
```

## Maintenance

### Reset Test Database

To completely reset the test database:

```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE kododb_test;"
psql -U postgres -c "CREATE DATABASE kododb_test;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kododb_test TO kodo_user;"

# Run migrations
$env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
npx prisma migrate deploy
```

### Update Test Schema

When you add new migrations:

```bash
# Apply new migrations to test database
$env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
npx prisma migrate deploy
```

## Troubleshooting

### Connection Refused

If you get "connection refused" errors:

1. Verify PostgreSQL is running:
   ```bash
   Get-Service postgresql*
   ```

2. Check connection string in `.env.test`

3. Test connection:
   ```bash
   psql -U kodo_user -d kododb_test
   ```

### Migration Errors

If migrations fail:

1. Check if test database exists:
   ```bash
   psql -U postgres -c "\l" | Select-String "kododb_test"
   ```

2. Verify user permissions:
   ```bash
   psql -U postgres -d kododb_test -c "\du"
   ```

3. Reset migrations:
   ```bash
   $env:DATABASE_URL="postgresql://kodo_user:kodo_password@localhost:5432/kododb_test"
   npx prisma migrate reset --force
   ```

### Tests Hanging

If tests hang or don't complete:

1. Ensure Prisma disconnects after tests (already configured in testUtils.js)
2. Check for open database connections
3. Use `--forceExit` flag (already in jest.config.js)

### Slow Tests

To improve test performance:

1. Use transactions for test isolation (advanced)
2. Mock external services (already configured)
3. Run tests in parallel with `--maxWorkers` flag
4. Use test database on SSD if possible

## Best Practices

1. **Never use production database for tests**
2. **Always clean up test data after tests**
3. **Use separate test database for CI/CD**
4. **Keep test database schema in sync with dev**
5. **Monitor test database size and clean periodically**

## CI/CD Configuration

For automated testing environments:

```yaml
# GitHub Actions example
env:
  DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/test_db
  
steps:
  - name: Setup Database
    run: |
      psql -c "CREATE DATABASE test_db;"
      npx prisma migrate deploy
      
  - name: Run Tests
    run: npm test
```
