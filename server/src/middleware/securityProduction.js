/**
 * Production Security Middleware
 * Enforces security best practices for production deployments
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../lib/logger');

/**
 * Get enhanced Helmet configuration for production
 */
const getHelmetConfig = () => {
  const isDev = process.env.NODE_ENV !== 'production';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: !isDev ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'api.kodo.com', '*.stripe.com', '*.mapbox.com'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    } : false,

    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },

    // Disable MIME type sniffing
    noSniff: true,

    // Enable XSS protection
    xssFilter: true,

    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Permissions Policy
    permissionsPolicy: {
      features: {
        geolocation: ['self'],
        microphone: ['none'],
        camera: ['none'],
      },
    },
  });
};

/**
 * Get enhanced CORS configuration for production
 */
const getCorsConfig = () => {
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS request blocked', {
          origin,
          allowedOrigins,
        });
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '5'), // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP address and optional user identifier
    return req.ip || req.connection.remoteAddress;
  },
  skip: (req) => {
    // Skip rate limiting for certain paths
    return req.path === '/health';
  },
});

/**
 * Rate limiting for general API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and public endpoints
    return req.path === '/health' || req.path === '/';
  },
});

/**
 * Input validation and sanitization
 */
const validateInput = (req, res, next) => {
  try {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          // Remove null bytes and control characters
          req.query[key] = req.query[key]
            .replace(/\0/g, '')
            .replace(/[\x00-\x1F\x7F]/g, '');
        }
      });
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj) => {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key]
              .replace(/\0/g, '')
              .replace(/[\x00-\x1F\x7F]/g, '');
          } else if (Array.isArray(obj[key])) {
            obj[key].forEach((item, index) => {
              if (typeof item === 'string') {
                obj[key][index] = item
                  .replace(/\0/g, '')
                  .replace(/[\x00-\x1F\x7F]/g, '');
              } else if (typeof item === 'object' && item !== null) {
                sanitizeObject(item);
              }
            });
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        });
      };
      sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    logger.error('Input validation error:', error);
    res.status(400).json({
      error: true,
      message: 'Invalid input',
      code: 'INVALID_INPUT',
    });
  }
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * HTTPS redirect middleware
 */
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
};

module.exports = {
  getHelmetConfig,
  getCorsConfig,
  authLimiter,
  apiLimiter,
  validateInput,
  securityHeaders,
  httpsRedirect,
  mongoSanitize: mongoSanitize(),
};

