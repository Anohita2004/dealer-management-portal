// scripts/test-workflow.js
// Test script for workflow engine

const { WorkflowService } = require('../src/services/workflow');
const { Order, Invoice, User, Role } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function testWorkflow() {
  try {
    console.log('🧪 Testing Workflow Engine...\n');

    // Test 1: Start workflow
    console.log('Test 1: Starting workflow for an order...');
    const order = await Order.findOne({ limit: 1 });
    if (!order) {
      console.log('⚠️  No orders found. Please create an order first.');
      return;
    }

    const testUser = await User.findOne({
      include: [{ model: Role, as: 'roleDetails' }],
      limit: 1
    });

    if (!testUser) {
      console.log('⚠️  No users found. Please create a user first.');
      return;
    }

    // Start workflow if not already started
    if (!order.approvalStage) {
      await WorkflowService.startWorkflow('order', order, testUser);
      console.log(`✅ Workflow started. Current stage: ${order.approvalStage}`);
    } else {
      console.log(`✅ Order already in workflow. Current stage: ${order.approvalStage}`);
    }

    // Test 2: Get workflow status
    console.log('\nTest 2: Getting workflow status...');
    const status = await WorkflowService.getWorkflowStatus('order', order);
    console.log('✅ Workflow Status:');
    console.log(`   - Current Stage: ${status.currentStage}`);
    console.log(`   - Approval Status: ${status.approvalStatus}`);
    console.log(`   - Completed Stages: ${status.completedStages.join(', ') || 'None'}`);
    console.log(`   - Pending Stages: ${status.pendingStages.join(', ') || 'None'}`);
    console.log(`   - Timeline Entries: ${status.timeline.length}`);

    // Test 3: Test pipeline definitions
    console.log('\nTest 3: Testing pipeline definitions...');
    const { getAllPipelines } = require('../src/services/workflow');
    const pipelines = getAllPipelines();
    console.log('✅ Available Pipelines:');
    Object.keys(pipelines).forEach(type => {
      console.log(`   - ${type}: ${pipelines[type].join(' → ')}`);
    });

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testWorkflow();
}

module.exports = { testWorkflow };

