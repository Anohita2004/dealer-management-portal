// scripts/start-and-check.js
// Start server and check for errors

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting server...\n');

const server = spawn('node', ['src/server.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

let errorOutput = '';

server.stderr?.on('data', (data) => {
  const output = data.toString();
  errorOutput += output;
  process.stderr.write(data);
});

server.stdout?.on('data', (data) => {
  process.stdout.write(data);
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}`);
    if (errorOutput) {
      console.error('Errors:', errorOutput);
    }
    process.exit(code);
  }
});

// Keep process alive
process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

