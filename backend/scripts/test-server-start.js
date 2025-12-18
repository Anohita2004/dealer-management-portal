// scripts/test-server-start.js
// Test server startup with error capture

console.log('🧪 Testing server startup...\n');

// Capture console output
const originalLog = console.log;
const originalError = console.error;
const logs = [];
const errors = [];

console.log = (...args) => {
  logs.push(args.join(' '));
  originalLog(...args);
};

console.error = (...args) => {
  errors.push(args.join(' '));
  originalError(...args);
};

// Set timeout to kill process if it hangs
const timeout = setTimeout(() => {
  console.log('\n⏱️  Server startup timeout (10s)');
  console.log('\n📋 Logs captured:');
  logs.forEach(log => console.log('  ', log));
  if (errors.length > 0) {
    console.log('\n❌ Errors captured:');
    errors.forEach(err => console.log('  ', err));
  }
  process.exit(1);
}, 10000);

try {
  // Try to start server
  require('../src/server.js');
  
  // If we get here, server started
  setTimeout(() => {
    clearTimeout(timeout);
    console.log('\n✅ Server appears to have started');
    console.log('\n📋 Startup logs:');
    logs.slice(-10).forEach(log => console.log('  ', log));
    if (errors.length > 0) {
      console.log('\n⚠️  Errors during startup:');
      errors.forEach(err => console.log('  ', err));
    }
    process.exit(0);
  }, 3000);
  
} catch (error) {
  clearTimeout(timeout);
  console.error('\n❌ Server startup failed:', error.message);
  console.error('Stack:', error.stack);
  if (errors.length > 0) {
    console.error('\nAdditional errors:');
    errors.forEach(err => console.error('  ', err));
  }
  process.exit(1);
}

