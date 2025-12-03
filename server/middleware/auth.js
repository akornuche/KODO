const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 * Expects Bearer token in Authorization header
 */
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          error: true,
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }
      req.user = user; // Attach user info to request
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: true,
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} roles - Required role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      return res.status(403).json({
        error: true,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        details: { required: roles, current: req.user.role },
      });
    }

    next();
  };
}

/**
 * Optional auth - attaches user if token exists but doesn't fail if not
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
};
