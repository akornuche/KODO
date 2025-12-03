const { v4: uuidv4 } = require('uuid');
const logger = require('../src/lib/logger');

/**
 * Middleware to attach unique request ID to each request
 */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Middleware to log HTTP requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  logger.http(`${req.method} ${req.path}`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.path} - ${res.statusCode}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} - ${res.statusCode}`, logData);
    } else {
      logger.http(`${req.method} ${req.path} - ${res.statusCode}`, logData);
    }
  });

  next();
}

module.exports = {
  requestId,
  requestLogger,
};
