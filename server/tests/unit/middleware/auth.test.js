const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, optionalAuth } = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const token = jwt.sign({ userId: '123', role: 'buyer' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toHaveProperty('userId', '123');
      expect(req.user).toHaveProperty('role', 'buyer');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const token = jwt.sign(
        { userId: '123', role: 'buyer' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', () => {
      req.headers['authorization'] = 'InvalidFormat';

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = { userId: '123', role: 'buyer' };
    });

    it('should allow user with correct role', () => {
      const middleware = requireRole('buyer');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple roles', () => {
      const middleware = requireRole('admin', 'buyer', 'seller');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user with wrong role', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Access denied. Required role: admin',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: { required: ['admin'], current: 'buyer' }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if user not authenticated', () => {
      req.user = null;
      const middleware = requireRole('buyer');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple required roles correctly', () => {
      req.user.role = 'seller';
      const middleware = requireRole('buyer', 'seller');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', () => {
      const token = jwt.sign({ userId: '123', role: 'buyer' }, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toHaveProperty('userId', '123');
      expect(req.user).toHaveProperty('role', 'buyer');
    });

    it('should proceed without user if no token', () => {
      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should proceed without user if invalid token', () => {
      req.headers['authorization'] = 'Bearer invalid-token';

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should not throw error on malformed token', () => {
      req.headers['authorization'] = 'Bearer malformed.token.here';

      expect(() => {
        optionalAuth(req, res, next);
      }).not.toThrow();

      expect(next).toHaveBeenCalled();
    });
  });
});
