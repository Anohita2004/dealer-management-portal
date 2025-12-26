/**
 * Unit tests for JWT utility functions
 */
const { generateToken, verifyToken } = require('../../../src/utils/jwt');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '1h';

describe('JWT Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 1;
      const role = 'admin';

      const token = generateToken(userId, role);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
    });

    it('should generate different tokens for different inputs', () => {
      const token1 = generateToken(1, 'admin');
      const token2 = generateToken(2, 'user');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 1;
      const role = 'admin';
      const token = generateToken(userId, role);

      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
    });

    it('should return null for an invalid token', () => {
      const invalidToken = 'invalid.token.here';

      const decoded = verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for an expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 1, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const decoded = verifyToken(expiredToken);

      expect(decoded).toBeNull();
    });

    it('should return null for a token with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { userId: 1, role: 'admin' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const decoded = verifyToken(wrongSecretToken);

      expect(decoded).toBeNull();
    });
  });
});

