// Mock dependencies BEFORE importing the controller
jest.mock('../../../src/lib/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../../src/lib/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve({ messageId: 'test-123' })),
  templates: {
    welcome: jest.fn(() => ({ subject: 'Welcome', html: '<p>Welcome</p>' })),
  },
}));

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authController = require('../../../src/controllers/authController');
const prisma = require('../../../src/lib/prisma');
const { sendEmail } = require('../../../src/lib/email');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    
    // Ensure sendEmail mock returns a promise
    sendEmail.mockReturnValue(Promise.resolve({ messageId: 'test-123' }));
  });

  describe('register', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        role: 'buyer',
      };
    });

    it('should register a new user successfully', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '123',
        email: req.body.email,
        username: req.body.username,
        role: req.body.role,
        createdAt: new Date(),
      });

      await authController.register(req, res);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: req.body.email },
            { username: req.body.username },
          ],
        },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: expect.any(Object),
        })
      );
    });

    it('should fail with missing fields', async () => {
      req.body = { email: 'test@example.com' };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Email, username, and password are required',
        code: 'MISSING_FIELDS',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should fail with invalid email format', async () => {
      req.body.email = 'invalid-email';

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    });

    it('should fail with weak password', async () => {
      req.body.password = '123';

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD',
      });
    });

    it('should fail with invalid role', async () => {
      req.body.role = 'invalid_role';

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid role. Must be one of: buyer, seller, courier, admin',
        code: 'INVALID_ROLE',
      });
    });

    it('should fail if user already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: '123',
        email: req.body.email,
        username: 'otheruser',
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'User with this email already exists',
        code: 'USER_EXISTS',
        details: { field: 'email' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '123',
        email: req.body.email,
        username: req.body.username,
        role: req.body.role,
      });

      await authController.register(req, res);

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(req.body.password);
      expect(createCall.data.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should handle database errors', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Internal server error during registration',
        code: 'REGISTRATION_ERROR',
      });
    });
  });

  describe('login', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      password: '$2b$10$hashedpassword',
      role: 'buyer',
    };

    beforeEach(() => {
      req.body = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };
    });

    it('should login successfully with correct credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: req.body.emailOrUsername },
            { username: req.body.emailOrUsername },
          ],
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, mockUser.password);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            role: mockUser.role,
          }),
        })
      );
    });

    it('should fail with missing credentials', async () => {
      req.body = { emailOrUsername: 'test@example.com' };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Email/username and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    });

    it('should fail with non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should fail with incorrect password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should work with username instead of email', async () => {
      req.body.emailOrUsername = 'testuser';
      prisma.user.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'testuser' },
            { username: 'testuser' },
          ],
        },
      });
      expect(res.json).toHaveBeenCalled();
    });

    it('should generate valid JWT token', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await authController.login(req, res);

      const responseData = res.json.mock.calls[0][0];
      const token = responseData.token;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id', mockUser.id);
      expect(decoded).toHaveProperty('email', mockUser.email);
      expect(decoded).toHaveProperty('username', mockUser.username);
      expect(decoded).toHaveProperty('role', mockUser.role);
    });

    it('should handle database errors', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
