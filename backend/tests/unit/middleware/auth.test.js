/**
 * Unit tests for authentication middleware
 */
const { authenticate, authorize } = require('../../../src/middleware/auth');
const { User, Role, Dealer } = require('../../../src/models');
const jwt = require('jsonwebtoken');
const { createMockRequest, createMockResponse, createMockNext } = require('../../helpers/testHelpers');

// Mock models
jest.mock('../../../src/models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  Role: {},
  Dealer: {},
}));

// Mock JWT - need to mock it as a callback-based function for promisify to work
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret, callback) => {
    // Default behavior - will be overridden in tests
    if (callback) {
      callback(null, { userId: 1 });
    }
  }),
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    
    // Reset jwt.verify to default callback behavior
    jwt.verify.mockImplementation((token, secret, callback) => {
      if (callback) {
        callback(null, { userId: 1 });
      }
    });
  });

  describe('authenticate', () => {
    it('should return 401 if authorization header is missing', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authorization header missing' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization format is invalid', async () => {
      req.headers.authorization = 'InvalidFormat token123';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        if (callback) {
          callback(new Error('Invalid token'), null);
        }
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate user with valid token', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        roleId: 1,
        isActive: true,
        isBlocked: false,
        roleDetails: { id: 1, name: 'admin' },
        dealer: null,
      };

      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        if (callback) {
          callback(null, { userId: 1 });
        }
      });
      User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.username).toBe('testuser');
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if user is not found', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        if (callback) {
          callback(null, { userId: 999 });
        }
      });
      User.findByPk = jest.fn().mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access if user has required role', () => {
      req.user = { role: 'admin' };
      const middleware = authorize('admin', 'user');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access if user does not have required role', () => {
      req.user = { role: 'user' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      req.user = null;
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access if no roles are specified', () => {
      req.user = { role: 'any' };
      const middleware = authorize();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should be case insensitive for role comparison', () => {
      req.user = { role: 'ADMIN' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

