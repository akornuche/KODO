/**
 * Production-Grade Logging System
 * Structured logging with rotation, levels, and formatting
 */

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels (Winston standard)
 */
const LOG_LEVELS = {
  error: 0,    // Critical errors
  warn: 1,     // Warnings
  info: 2,     // General information
  http: 3,     // HTTP requests
  debug: 4,    // Debug information
};

/**
 * Log colors
 */
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(LOG_COLORS);

/**
 * Log format
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  format,
  defaultMeta: {
    service: 'kodo-server',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    // Error logs (file)
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '50m',
      maxDays: '30d',
      compress: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.prettyPrint(),
      ),
    }),

    // All logs (file)
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxDays: '30d',
      compress: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // HTTP logs (file - separate rotation)
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '50m',
      maxDays: '7d',
      compress: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// Add console transport in development/production
if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) =>
            `${info.timestamp} [${info.level}]: ${info.message}`,
        ),
      ),
    }),
  );
}

/**
 * Structured logging helper
 */
class StructuredLogger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Log error with full context
   */
  error(message, error, metadata = {}) {
    logger.error(message, {
      ...this.context,
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      } : error,
    });
  }

  /**
   * Log warning
   */
  warn(message, metadata = {}) {
    logger.warn(message, {
      ...this.context,
      ...metadata,
    });
  }

  /**
   * Log info
   */
  info(message, metadata = {}) {
    logger.info(message, {
      ...this.context,
      ...metadata,
    });
  }

  /**
   * Log HTTP request/response
   */
  http(message, metadata = {}) {
    logger.http(message, {
      ...this.context,
      ...metadata,
    });
  }

  /**
   * Log debug info
   */
  debug(message, metadata = {}) {
    logger.debug(message, {
      ...this.context,
      ...metadata,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext = {}) {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation, query, duration, metadata = {}) {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level](`Database operation: ${operation}`, {
      ...this.context,
      operation,
      query: query.substring(0, 100), // Limit query logging
      duration_ms: duration,
      ...metadata,
    });
  }

  /**
   * Log API call
   */
  logApiCall(method, path, statusCode, duration, metadata = {}) {
    const level = statusCode >= 400 ? 'warn' : 'http';
    logger[level](`API ${method} ${path} ${statusCode}`, {
      ...this.context,
      method,
      path,
      statusCode,
      duration_ms: duration,
      ...metadata,
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(event, userId, metadata = {}) {
    logger.info(`Authentication: ${event}`, {
      ...this.context,
      userId,
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}

/**
 * Create root logger instance
 */
const rootLogger = new StructuredLogger({
  service: 'kodo-server',
});

module.exports = {
  logger: rootLogger,
  StructuredLogger,
  winstonLogger: logger, // Export raw Winston logger
  LOG_LEVELS,
};

