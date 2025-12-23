# Testing Guide

This directory contains unit and integration tests for the backend application.

## Test Structure

```
tests/
├── setup.js                 # Global test setup
├── helpers/
│   ├── testHelpers.js      # Mock request/response helpers
│   └── dbHelpers.js         # Database test helpers
├── unit/                    # Unit tests (mocked dependencies)
│   ├── controllers/
│   ├── middleware/
│   └── utils/
└── integration/             # Integration tests (real database)
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

## Test Configuration

Tests are configured via `jest.config.js` in the root directory. Key settings:

- **Test Environment**: Node.js
- **Timeout**: 10 seconds per test
- **Coverage**: Excludes migrations, scripts, and config files
- **Setup**: Runs `tests/setup.js` before all tests

## Writing Tests

### Unit Tests

Unit tests should mock all external dependencies (database, external APIs, etc.).

Example:
```javascript
const { myFunction } = require('../../src/utils/myUtils');
const { MyModel } = require('../../src/models');

jest.mock('../../src/models');

describe('My Function', () => {
  it('should do something', () => {
    MyModel.findOne = jest.fn().mockResolvedValue({ id: 1 });
    // Test implementation
  });
});
```

### Integration Tests

Integration tests use a real database connection. Set up test database environment variables:

```env
TEST_DB_NAME=test_db
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
```

Integration tests will be skipped if `TEST_DB_NAME` is not set.

## Test Helpers

### Mock Request/Response

```javascript
const { createMockRequest, createMockResponse } = require('../helpers/testHelpers');

const req = createMockRequest({ body: { username: 'test' } });
const res = createMockResponse();
```

### Database Helpers

```javascript
const { createTestUser, cleanupTestData } = require('../helpers/dbHelpers');

beforeEach(async () => {
  await cleanupTestData();
});

const user = await createTestUser({ username: 'testuser' });
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests
3. **Mocking**: Mock external dependencies in unit tests
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Coverage**: Aim for high code coverage, especially for critical business logic
6. **Speed**: Keep unit tests fast (< 100ms each)
7. **Integration**: Use integration tests sparingly for critical flows

## Example Test Files

- `tests/unit/utils/jwt.test.js` - JWT utility tests
- `tests/unit/middleware/auth.test.js` - Authentication middleware tests
- `tests/unit/controllers/authController.test.js` - Auth controller tests
- `tests/integration/auth.integration.test.js` - Full authentication flow tests

## Troubleshooting

### Tests failing with database connection errors
- Ensure test database is set up and accessible
- Check environment variables are correctly set
- Verify database migrations have been run

### Tests timing out
- Increase timeout in `jest.config.js` if needed
- Check for hanging promises or unclosed connections
- Ensure cleanup functions are properly called

### Mock not working
- Verify `jest.mock()` is called before requiring the module
- Check that mocks are reset between tests with `jest.clearAllMocks()`

