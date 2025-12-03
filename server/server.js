require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./src/lib/logger');
const prisma = require('./src/lib/prisma');
const { initializeSocket } = require('./src/lib/socket');
const { handleUnhandledRejection, handleUncaughtException } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 4000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 KODO Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API: http://localhost:${PORT}`);
  logger.info(`🔌 Socket.IO real-time server ready`);
  logger.info(`📝 Log Level: ${logger.level}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  handleUnhandledRejection(reason, promise);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  handleUncaughtException(error);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connection
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forcefully shutting down after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
