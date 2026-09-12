/**
 * Error Monitoring & Sentry Integration
 * Centralized error tracking, reporting, and performance monitoring
 */

const Sentry = require('@sentry/node');
const logger = require('./logger');

/**
 * Initialize Sentry for error monitoring
 */
const initializeSentry = () => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured - error monitoring disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({
          request: true,
          serverName: true,
          transaction: true,
          user: true,
        }),
      ],
      beforeSend(event, hint) {
        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Ignore network timeout errors in development
          if (process.env.NODE_ENV !== 'production' && error?.message?.includes('timeout')) {
            return null;
          }
          
          // Ignore 4xx client errors (optional)
          if (event.request?.url?.includes('/api/health')) {
            return null;
          }
        }
        
        return event;
      },
      denyUrls: [
        // Browser extensions
        /extensions\//i,
        /^chrome:\/\//i,
      ],
    });

    logger.info('Sentry initialized successfully', {
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    });

    return true;
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
    return false;
  }
};

/**
 * Sentry request handler (use before route handlers)
 */
const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler();
};

/**
 * Sentry error handler (use after route handlers)
 */
const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler();
};

/**
 * Enhanced error context for better debugging
 */
const captureErrorContext = (error, context = {}) => {
  const errorContext = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    errorType: error.constructor.name,
    ...context,
  };

  Sentry.captureException(error, {
    contexts: {
      error: errorContext,
    },
    tags: {
      'error.type': error.constructor.name,
      'environment': process.env.NODE_ENV,
    },
  });

  return errorContext;
};

/**
 * Capture message event
 */
const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, level);
  
  // Also log locally
  if (level === 'error') {
    logger.error(message, context);
  } else if (level === 'warning') {
    logger.warn(message, context);
  } else {
    logger.info(message, context);
  }
};

/**
 * Set user context for error tracking
 */
const setUserContext = (userId, userData = {}) => {
  if (userId) {
    Sentry.setUser({
      id: userId,
      ...userData,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Clear user context
 */
const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for tracking
 */
const addBreadcrumb = (message, category = 'default', level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Performance transaction tracking
 */
const startTransaction = (name, op = 'http.server') => {
  const transaction = Sentry.startTransaction({
    name,
    op,
  });

  return {
    finish: () => transaction.finish(),
    child: (childName, childOp = 'db') => {
      return transaction.startChild({
        op: childOp,
        description: childName,
      });
    },
  };
};

module.exports = {
  initializeSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureErrorContext,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  startTransaction,
  Sentry, // Export Sentry for direct access if needed
};

