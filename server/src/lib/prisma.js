const { PrismaClient } = require('@prisma/client');

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Connection pooling configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Performance optimizations
  errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
});

// Enable connection pool settings for production
if (process.env.NODE_ENV === 'production') {
  // Connection pool will be managed by the datasource URL connection parameters
  // Example: postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=20
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
