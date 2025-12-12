// scripts/check-server.js
// Check server for errors without starting it

console.log('🔍 Checking server for errors...\n');

const checks = [];

// Check 1: Server file syntax
try {
  require('../src/server.js');
  checks.push({ name: 'Server file loads', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'Server file loads', status: '❌', error: error.message });
}

// Check 2: Workflow service
try {
  const { WorkflowService } = require('../src/services/workflow');
  checks.push({ name: 'WorkflowService imports', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'WorkflowService imports', status: '❌', error: error.message });
}

// Check 3: WorkflowResolver
try {
  const { WorkflowResolver } = require('../src/services/workflow');
  checks.push({ name: 'WorkflowResolver imports', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'WorkflowResolver imports', status: '❌', error: error.message });
}

// Check 4: Pipelines
try {
  const { getPipeline } = require('../src/services/workflow');
  const orderPipeline = getPipeline('order');
  if (orderPipeline && orderPipeline.length > 0) {
    checks.push({ name: 'Pipelines work', status: '✅', error: null });
  } else {
    checks.push({ name: 'Pipelines work', status: '❌', error: 'Pipeline empty' });
  }
} catch (error) {
  checks.push({ name: 'Pipelines work', status: '❌', error: error.message });
}

// Check 5: WorkflowTimeline model
try {
  const { WorkflowTimeline } = require('../src/models');
  checks.push({ name: 'WorkflowTimeline model', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'WorkflowTimeline model', status: '❌', error: error.message });
}

// Check 6: WorkflowController
try {
  const workflowController = require('../src/controllers/workflowController');
  checks.push({ name: 'WorkflowController imports', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'WorkflowController imports', status: '❌', error: error.message });
}

// Check 7: Routes
try {
  const workflowRoutes = require('../src/routes/workflowRoutes');
  checks.push({ name: 'WorkflowRoutes imports', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'WorkflowRoutes imports', status: '❌', error: error.message });
}

// Check 8: Database connection
try {
  const { sequelize } = require('../src/config/database');
  checks.push({ name: 'Database config', status: '✅', error: null });
} catch (error) {
  checks.push({ name: 'Database config', status: '❌', error: error.message });
}

// Print results
console.log('\n📊 Check Results:\n');
let hasErrors = false;
checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  if (check.error) {
    console.log(`   Error: ${check.error}\n`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.log('\n❌ Some checks failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed! Server should start without errors.');
  process.exit(0);
}

