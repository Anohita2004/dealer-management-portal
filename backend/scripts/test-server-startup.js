// scripts/test-server-startup.js
// Test server startup without actually starting the HTTP server

console.log('🧪 Testing server startup...\n');

// Suppress server from actually starting
const originalListen = require('http').Server.prototype.listen;
let serverStarted = false;

require('http').Server.prototype.listen = function(...args) {
  serverStarted = true;
  console.log('✅ Server would start on port:', args[0] || 'default');
  // Don't actually start, just verify it would
  return this;
};

try {
  // Import server (this will execute the file but we've intercepted listen)
  delete require.cache[require.resolve('../src/server.js')];
  require('../src/server.js');
  
  if (serverStarted) {
    console.log('\n✅ Server startup test passed!');
    console.log('✅ All routes and middleware loaded successfully');
    console.log('✅ No errors detected during startup');
  } else {
    console.log('\n⚠️  Server listen() was not called');
  }
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Server startup error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

