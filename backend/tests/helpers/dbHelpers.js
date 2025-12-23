/**
 * Database test helpers
 * Use these for integration tests that require database access
 */

const { sequelize } = require('../../src/config/database');
const { User, Dealer, Role, Order, Invoice, Payment } = require('../../src/models');

/**
 * Clean up test data from database
 */
const cleanupTestData = async () => {
  try {
    // Delete in reverse order of dependencies
    // Check if models exist before trying to destroy
    if (Payment && typeof Payment.destroy === 'function') {
      await Payment.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (Invoice && typeof Invoice.destroy === 'function') {
      await Invoice.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (Order && typeof Order.destroy === 'function') {
      await Order.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (Dealer && typeof Dealer.destroy === 'function') {
      await Dealer.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (User && typeof User.destroy === 'function') {
      await User.destroy({ where: {}, truncate: true, cascade: true });
    }
    if (Role && typeof Role.destroy === 'function') {
      await Role.destroy({ where: {}, truncate: true, cascade: true });
    }
  } catch (error) {
    // Silently fail - models might not be available in test environment
    // console.error('Error cleaning up test data:', error);
  }
};

/**
 * Setup test database (run migrations, seed data, etc.)
 */
const setupTestDatabase = async () => {
  try {
    // Sync database schema (use with caution - may not work with migrations)
    // await sequelize.sync({ force: false });
    
    // Or run migrations if needed
    // const { execSync } = require('child_process');
    // execSync('npm run migrate:workflow', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error setting up test database:', error);
  }
};

/**
 * Create test role
 */
const createTestRole = async (overrides = {}) => {
  return await Role.create({
    name: 'TestRole',
    description: 'Test Role',
    permissions: [],
    ...overrides,
  });
};

/**
 * Create test user
 */
const createTestUser = async (overrides = {}) => {
  const role = await createTestRole();
  return await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!@#',
    roleId: role.id,
    isActive: true,
    isBlocked: false,
    ...overrides,
  });
};

/**
 * Create test dealer
 */
const createTestDealer = async (overrides = {}) => {
  return await Dealer.create({
    name: 'Test Dealer',
    code: 'TEST001',
    email: 'dealer@test.com',
    phone: '1234567890',
    address: 'Test Address',
    isActive: true,
    ...overrides,
  });
};

module.exports = {
  cleanupTestData,
  setupTestDatabase,
  createTestRole,
  createTestUser,
  createTestDealer,
};

