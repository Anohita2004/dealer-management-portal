/**
 * Unit tests for authentication controller
 */
const { login, verifyOTP, resetPassword, resetPasswordConfirm } = require('../../../src/controllers/authController');
const { User, Role, Dealer, AuditLog } = require('../../../src/models');
const { generateToken } = require('../../../src/utils/jwt');
const { createMockRequest, createMockResponse } = require('../../helpers/testHelpers');

// Mock dependencies
jest.mock('../../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Role: {},
  Dealer: {},
  AuditLog: {
    create: jest.fn(),
  },
}));

jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn(),
}));

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('login', () => {
    it('should return 401 if user is not found', async () => {
      req.body = { username: 'nonexistent', password: 'password' };
      User.findOne = jest.fn().mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 403 if user account is inactive', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        isActive: false,
        isBlocked: false,
        validatePassword: jest.fn(),
      };
      req.body = { username: 'testuser', password: 'password' };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account inactive/blocked' });
    });

    it('should return 401 if password is invalid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        isActive: true,
        isBlocked: false,
        validatePassword: jest.fn().mockResolvedValue(false),
        generateOTP: jest.fn().mockReturnValue('123456'),
        save: jest.fn().mockResolvedValue(true),
      };
      req.body = { username: 'testuser', password: 'wrongpassword' };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should generate OTP and return success for valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        isActive: true,
        isBlocked: false,
        validatePassword: jest.fn().mockResolvedValue(true),
        generateOTP: jest.fn().mockReturnValue('123456'),
        save: jest.fn().mockResolvedValue(true),
      };
      req.body = { username: 'testuser', password: 'correctpassword' };
      req.ip = '127.0.0.1';
      req.headers['user-agent'] = 'test-agent';
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      AuditLog.create = jest.fn().mockResolvedValue({});

      await login(req, res);

      expect(mockUser.generateOTP).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'OTP generated',
        userId: 1,
        otpSent: true,
        otp: undefined, // NODE_ENV is 'test', not 'development'
      });
    });
  });

  describe('verifyOTP', () => {
    it('should return 404 if user is not found', async () => {
      req.body = { userId: 999, otp: '123456' };
      User.findByPk = jest.fn().mockResolvedValue(null);

      await verifyOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 401 if OTP is invalid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        validateOTP: jest.fn().mockReturnValue(false),
      };
      req.body = { userId: 1, otp: 'wrongotp' };
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await verifyOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired OTP' });
    });

    it('should return token and user data for valid OTP', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        roleId: 1,
        dealerId: null,
        validateOTP: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
        roleDetails: { name: 'admin' },
        dealer: null,
      };
      req.body = { userId: 1, otp: '123456' };
      req.ip = '127.0.0.1';
      req.headers['user-agent'] = 'test-agent';
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      generateToken.mockReturnValue('mock-jwt-token');
      AuditLog.create = jest.fn().mockResolvedValue({});

      await verifyOTP(req, res);

      expect(mockUser.validateOTP).toHaveBeenCalledWith('123456');
      expect(mockUser.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin',
          roleId: 1,
          dealerId: null,
          dealer: null,
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should return 404 if user is not found', async () => {
      req.body = { username: 'nonexistent', email: 'test@example.com' };
      User.findOne = jest.fn().mockResolvedValue(null);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should generate OTP and return success for valid user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        generateOTP: jest.fn().mockReturnValue('123456'),
        save: jest.fn().mockResolvedValue(true),
      };
      req.body = { username: 'testuser', email: 'test@example.com' };
      req.ip = '127.0.0.1';
      req.headers['user-agent'] = 'test-agent';
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      AuditLog.create = jest.fn().mockResolvedValue({});

      await resetPassword(req, res);

      expect(mockUser.generateOTP).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Password reset OTP sent',
        userId: 1,
      });
    });
  });

  describe('resetPasswordConfirm', () => {
    it('should return 404 if user is not found', async () => {
      req.body = { userId: 999, otp: '123456', newPassword: 'newpass' };
      User.findByPk = jest.fn().mockResolvedValue(null);

      await resetPasswordConfirm(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 401 if OTP is invalid', async () => {
      const mockUser = {
        id: 1,
        validateOTP: jest.fn().mockReturnValue(false),
      };
      req.body = { userId: 1, otp: 'wrongotp', newPassword: 'newpass' };
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await resetPasswordConfirm(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired OTP' });
    });

    it('should reset password and return success for valid OTP', async () => {
      const mockUser = {
        id: 1,
        validateOTP: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      req.body = { userId: 1, otp: '123456', newPassword: 'newpassword123' };
      req.ip = '127.0.0.1';
      req.headers['user-agent'] = 'test-agent';
      User.findByPk = jest.fn().mockResolvedValue(mockUser);
      AuditLog.create = jest.fn().mockResolvedValue({});

      await resetPasswordConfirm(req, res);

      expect(mockUser.validateOTP).toHaveBeenCalledWith('123456');
      expect(mockUser.password).toBe('newpassword123');
      expect(mockUser.otp).toBeNull();
      expect(mockUser.otpExpiry).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful' });
    });
  });
});

