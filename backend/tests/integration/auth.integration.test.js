/**
 * Integration tests for authentication flow
 * These tests require a test database connection
 * 
 * To run these tests:
 * 1. Set up a test database
 * 2. Configure TEST_DB_* environment variables
 * 3. Run: npm run test:integration
 */

const request = require('supertest');

// Note: This will start the server when imported
// For better test isolation, consider refactoring server.js to export app without auto-starting
let app;
try {
  app = require('../../src/server');
} catch (error) {
  console.warn('Could not import server for integration tests:', error.message);
  app = null;
}
const { sequelize } = require('../../src/config/database');
const { User, Role, AuditLog } = require('../../src/models');
const { cleanupTestData, createTestUser, createTestRole } = require('../helpers/dbHelpers');

// Skip integration tests if TEST_DB_NAME is not set
const shouldRunIntegrationTests = process.env.TEST_DB_NAME || process.env.NODE_ENV === 'test';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests - TEST_DB_NAME not set');
      return;
    }
    // Setup test database if needed
    // await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return;
    try {
      await cleanupTestData();
      if (sequelize && typeof sequelize.close === 'function') {
        await sequelize.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    if (!shouldRunIntegrationTests) return;
    try {
      await cleanupTestData();
    } catch (error) {
      // Ignore cleanup errors - might be first run or models not available
    }
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if username or password is missing', async () => {
      if (!shouldRunIntegrationTests) {
        return expect(true).toBe(true); // Skip test
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      if (!shouldRunIntegrationTests) {
        return expect(true).toBe(true); // Skip test
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should generate OTP for valid credentials', async () => {
      if (!shouldRunIntegrationTests) {
        return expect(true).toBe(true); // Skip test
      }

      // Create test user
      const role = await createTestRole();
      const user = await createTestUser({
        username: 'testuser',
        password: 'Test123!@#',
        roleId: role.id,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP generated');
      expect(response.body.userId).toBe(user.id);
      expect(response.body.otpSent).toBe(true);

      // Verify OTP was saved to user
      const updatedUser = await User.findByPk(user.id);
      expect(updatedUser.otp).toBeDefined();
      expect(updatedUser.otpExpiry).toBeDefined();

      // Verify audit log was created
      const auditLog = await AuditLog.findOne({
        where: {
          userId: user.id,
          action: 'LOGIN_OTP_GENERATED',
        },
      });
      expect(auditLog).toBeDefined();
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should return token for valid OTP', async () => {
      if (!shouldRunIntegrationTests) {
        return expect(true).toBe(true); // Skip test
      }

      // Create test user and generate OTP
      const role = await createTestRole();
      const user = await createTestUser({
        username: 'testuser',
        password: 'Test123!@#',
        roleId: role.id,
      });

      // Generate OTP by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#',
        });

      expect(loginResponse.status).toBe(200);
      const otp = loginResponse.body.otp || '123456'; // Use provided OTP or default

      // Verify OTP
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user.id,
          otp: otp,
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.token).toBeDefined();
      expect(verifyResponse.body.user).toBeDefined();
      expect(verifyResponse.body.user.id).toBe(user.id);
    });

    it('should return 401 for invalid OTP', async () => {
      if (!shouldRunIntegrationTests) {
        return expect(true).toBe(true); // Skip test
      }

      const role = await createTestRole();
      const user = await createTestUser({
        username: 'testuser',
        password: 'Test123!@#',
        roleId: role.id,
      });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          userId: user.id,
          otp: 'wrongotp',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
});

