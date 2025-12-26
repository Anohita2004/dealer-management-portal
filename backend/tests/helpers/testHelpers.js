/**
 * Test helper utilities
 */

/**
 * Create a mock request object
 */
const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    user: null,
    ...overrides,
  };
};

/**
 * Create a mock response object
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create a mock next function
 */
const createMockNext = () => {
  return jest.fn();
};

/**
 * Wait for a specified amount of time
 */
const wait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create a test user object
 */
const createTestUser = (overrides = {}) => {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    isActive: true,
    isBlocked: false,
    roleId: 1,
    ...overrides,
  };
};

module.exports = {
  createMockRequest,
  createMockResponse,
  createMockNext,
  wait,
  createTestUser,
};

