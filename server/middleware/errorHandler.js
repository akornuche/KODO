const logger = require('../src/lib/logger');

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 - Not Found errors
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_SERVER_ERROR';
  err.message = err.message || 'Something went wrong';

  // Log error details
  const errorLog = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode,
    code: err.code,
    message: err.message,
    userId: req.user?.id,
    ip: req.ip || req.connection.remoteAddress,
  };

  if (err.statusCode >= 500) {
    logger.error('Server Error', { ...errorLog, stack: err.stack });
  } else if (err.statusCode >= 400) {
    logger.warn('Client Error', errorLog);
  }

  // Prisma errors
  if (err.code?.startsWith('P')) {
    return handlePrismaError(err, req, res);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: true,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      requestId: req.id,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: true,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      requestId: req.id,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: true,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message,
      requestId: req.id,
    });
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    return handleMulterError(err, req, res);
  }

  // Development vs Production error response
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse = {
    error: true,
    message: err.message,
    code: err.code,
    requestId: req.id,
  };

  // Add stack trace and additional details in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    if (err.details) {
      errorResponse.details = err.details;
    }
  }

  // Send error response
  res.status(err.statusCode).json(errorResponse);
}

/**
 * Handle Prisma database errors
 */
function handlePrismaError(err, req, res) {
  logger.error('Prisma Database Error', {
    requestId: req.id,
    code: err.code,
    message: err.message,
    meta: err.meta,
  });

  let statusCode = 500;
  let message = 'Database error';
  let code = 'DATABASE_ERROR';

  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      statusCode = 409;
      message = `A record with this ${err.meta?.target?.[0] || 'field'} already exists`;
      code = 'DUPLICATE_ENTRY';
      break;

    case 'P2025':
      // Record not found
      statusCode = 404;
      message = 'Record not found';
      code = 'NOT_FOUND';
      break;

    case 'P2003':
      // Foreign key constraint violation
      statusCode = 400;
      message = 'Invalid reference to related record';
      code = 'INVALID_REFERENCE';
      break;

    case 'P2014':
      // Required relation violation
      statusCode = 400;
      message = 'The change would violate a required relation';
      code = 'RELATION_VIOLATION';
      break;

    case 'P1001':
      // Can't reach database server
      statusCode = 503;
      message = 'Database unavailable';
      code = 'DATABASE_UNAVAILABLE';
      break;

    case 'P1008':
      // Operations timed out
      statusCode = 504;
      message = 'Database operation timed out';
      code = 'DATABASE_TIMEOUT';
      break;

    default:
      // Generic database error
      if (process.env.NODE_ENV === 'development') {
        message = err.message;
      }
  }

  return res.status(statusCode).json({
    error: true,
    message,
    code,
    requestId: req.id,
  });
}

/**
 * Handle Multer file upload errors
 */
function handleMulterError(err, req, res) {
  let statusCode = 400;
  let message = 'File upload error';
  let code = 'FILE_UPLOAD_ERROR';

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size too large';
      code = 'FILE_TOO_LARGE';
      break;

    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      code = 'TOO_MANY_FILES';
      break;

    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      code = 'UNEXPECTED_FILE';
      break;

    default:
      message = err.message;
  }

  logger.warn('Multer Error', {
    requestId: req.id,
    code: err.code,
    message: err.message,
    field: err.field,
  });

  return res.status(statusCode).json({
    error: true,
    message,
    code,
    requestId: req.id,
  });
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(reason, promise) {
  logger.error('Unhandled Promise Rejection', {
    reason: reason.message || reason,
    stack: reason.stack,
  });

  // In production, you might want to:
  // 1. Log to error tracking service (Sentry, Rollbar, etc.)
  // 2. Gracefully shutdown server
  // 3. Restart process (PM2, Docker, etc.)
  
  if (process.env.NODE_ENV === 'production') {
    // Graceful shutdown
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 */
function handleUncaughtException(error) {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });

  // In production, log and exit
  if (process.env.NODE_ENV === 'production') {
    // Graceful shutdown
    process.exit(1);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  asyncHandler,
};
