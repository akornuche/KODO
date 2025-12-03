const userController = require('../../../src/controllers/userController');
const prisma = require('../../../src/lib/prisma');
const bcrypt = require('bcryptjs');

jest.mock('../../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  product: {
    count: jest.fn(),
  },
  review: {
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('bcryptjs');

jest.mock('../../../src/lib/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
}));

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'user123', role: 'buyer' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      username: 'testuser',
      role: 'buyer',
      createdAt: new Date(),
    };

    it('should get user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await userController.getProfile(req, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: expect.objectContaining({
          id: true,
          email: true,
          username: true,
          role: true,
        }),
      });
      expect(res.json).toHaveBeenCalledWith({
        user: mockUser,
      });
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        requestId: undefined,
      });
    });

    it('should handle database errors', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await userController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProfile', () => {
    const mockUser = {
      id: 'user123',
      email: 'user@example.com',
      username: 'testuser',
    };

    beforeEach(() => {
      req.body = {
        username: 'newusername',
        email: 'newemail@example.com',
      };
    });

    it('should update user profile', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // No existing email
        .mockResolvedValueOnce(null); // No existing username
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        username: 'newusername',
        email: 'newemail@example.com',
      });

      await userController.updateProfile(req, res);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          username: 'newusername',
          email: 'newemail@example.com',
        },
        select: expect.any(Object),
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        user: expect.objectContaining({
          username: 'newusername',
          email: 'newemail@example.com',
        }),
      });
    });

    it('should return 409 if username is already taken', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // Email not taken
        .mockResolvedValueOnce({ id: 'otherUser', username: 'newusername' }); // Username taken

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Username already in use',
        code: 'USERNAME_EXISTS',
        requestId: undefined,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 409 if email is already taken', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 'otherUser', email: 'newemail@example.com' }) // Email taken
        .mockResolvedValueOnce(null); // Username not taken

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Email already in use',
        code: 'EMAIL_EXISTS',
        requestId: undefined,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 500 if user not found', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // Email not taken
        .mockResolvedValueOnce(null); // Username not taken
      prisma.user.update.mockRejectedValue(new Error('User not found'));

      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Failed to update profile',
        code: 'UPDATE_PROFILE_ERROR',
        requestId: undefined,
      });
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user123',
      password: 'hashedPassword',
    };

    beforeEach(() => {
      req.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };
    });

    it('should change password successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('newHashedPassword');
      prisma.user.update.mockResolvedValue({});

      await userController.changePassword(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword123', 'hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { password: 'newHashedPassword' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password changed successfully',
      });
    });

    it('should return 401 if current password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
        requestId: undefined,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 if new password is too weak', async () => {
      req.body.newPassword = 'weak';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'New password must be at least 8 characters long',
        code: 'INVALID_PASSWORD',
        requestId: undefined,
      });
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteAccount', () => {
    const mockUser = {
      id: 'user123',
      password: 'hashedPassword',
    };

    beforeEach(() => {
      req.body = {
        password: 'password123',
      };
    });

    it('should delete account with correct password', async () => {
      const mockUser = {
        id: 'user123',
        password: 'hashedPassword',
        orders: [],
        deliveries: [],
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      prisma.user.delete.mockResolvedValue(mockUser);

      await userController.deleteAccount(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Account deleted successfully',
      });
    });

    it('should fail with incorrect password', async () => {
      const mockUser = {
        id: 'user123',
        password: 'hashedPassword',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await userController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Password is incorrect',
        code: 'INVALID_PASSWORD',
        requestId: undefined,
      });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('should fail if password not provided', async () => {
      req.body.password = '';

      await userController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Password is required to delete account',
        code: 'MISSING_PASSWORD',
        requestId: undefined,
      });
    });

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await userController.deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
