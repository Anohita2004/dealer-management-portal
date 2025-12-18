// Direct Database Test for Material-to-Payment Flow
// Tests the flow by creating entities directly in the database
// Bypasses authentication to test core logic

const { sequelize, Material, Order, OrderItem, Invoice, PaymentRequest, User, Role, Dealer } = require('./src/models');
const WorkflowService = require('./src/services/workflow/WorkflowService');
const { Op } = require('sequelize');

let testData = {
  material: null,
  order: null,
  invoice: null,
  payment: null,
  dealer: null,
  users: {}
};

async function setupTestData() {
  console.log('\n🔧 Setting up test data...\n');
  
  try {
    // Find or create a dealer
    let dealer = await Dealer.findOne({ where: { isActive: true } });
    if (!dealer) {
      dealer = await Dealer.create({
        dealerCode: `TEST-${Date.now()}`,
        businessName: 'Test Dealer',
        contactPerson: 'Test Contact',
        email: 'test@dealer.com',
        phoneNumber: '1234567890',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        gstNumber: 'TEST123456',
        isActive: true
      });
      console.log(`✅ Created test dealer: ${dealer.id}`);
    } else {
      console.log(`✅ Using existing dealer: ${dealer.id}`);
    }
    testData.dealer = dealer;
    
    // Find roles
    const roles = await Role.findAll();
    const roleMap = {};
    roles.forEach(r => roleMap[r.name] = r);
    
    // Find users by role (we'll use them for workflow)
    // Include roleDetails to get the role name
    const findUserByRole = async (roleName) => {
      const role = roleMap[roleName];
      if (!role) return null;
      const user = await User.findOne({ 
        where: { roleId: role.id, isActive: true },
        include: [{ model: Role, as: 'roleDetails' }]
      });
      if (user && user.roleDetails) {
        // Ensure user has roleDetails loaded
        user.role = user.roleDetails.name;
      }
      return user;
    };
    
    testData.users.dealer_staff = await findUserByRole('dealer_staff');
    testData.users.dealer_admin = await findUserByRole('dealer_admin');
    testData.users.territory_manager = await findUserByRole('territory_manager');
    testData.users.area_manager = await findUserByRole('area_manager');
    testData.users.regional_manager = await findUserByRole('regional_manager');
    testData.users.regional_admin = await findUserByRole('regional_admin');
    testData.users.finance_admin = await findUserByRole('finance_admin');
    
    // Log found users
    console.log('\n📋 Found Users:');
    for (const [key, user] of Object.entries(testData.users)) {
      if (user) {
        const roleName = user.roleDetails?.name || user.role || 'unknown';
        console.log(`   ${key}: ${user.username} (role: ${roleName})`);
      }
    }
    
    console.log(`✅ Found ${Object.keys(testData.users).filter(k => testData.users[k]).length} test users`);
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up test data:', error.message);
    return false;
  }
}

async function testCreateMaterial() {
  console.log('\n📦 Test 1: Creating Material...');
  
  try {
    const material = await Material.create({
      materialNumber: `MAT-TEST-${Date.now()}`,
      name: 'Test Material',
      description: 'Automated test material',
      uom: 'PCS',
      stock: 1000
    });
    
    testData.material = material;
    console.log(`✅ Material created: ID ${material.id}, Number: ${material.materialNumber}`);
    return material.id;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testCreateOrder() {
  console.log('\n🛒 Test 2: Creating Order...');
  
  if (!testData.material) {
    console.log('❌ No material available');
    return null;
  }
  
  if (!testData.users.dealer_staff) {
    console.log('❌ No dealer_staff user available');
    return null;
  }
  
  try {
    const t = await sequelize.transaction();
    
    try {
      // Create order
      const order = await Order.create({
        orderNumber: `ORD-TEST-${Date.now()}`,
        dealerId: testData.dealer.id,
        createdBy: testData.users.dealer_staff.id,
        status: 'Pending',
        approvalStatus: 'pending',
        approvalStage: 'dealer_admin',
        totalAmount: 10000,
        notes: 'Automated test order'
      }, { transaction: t });
      
      // Create order item
      await OrderItem.create({
        orderId: order.id,
        materialId: testData.material.id,
        qty: 10,
        unitPrice: 1000,
        totalPrice: 10000
      }, { transaction: t });
      
      await t.commit();
      
      testData.order = order;
      console.log(`✅ Order created: ID ${order.id}, Status: ${order.status}, Stage: ${order.approvalStage}`);
      return order.id;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testApproveOrder() {
  console.log('\n✅ Test 3: Approving Order Through Workflow...');
  
  if (!testData.order) {
    console.log('❌ No order available');
    return false;
  }
  
  try {
    const t = await sequelize.transaction();
    
    try {
      // Reload order with items
      const order = await Order.findByPk(testData.order.id, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: t
      });
      
      // Approve through all stages
      const stages = ['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'];
      let currentOrder = order;
      
      for (const stage of stages) {
        const user = testData.users[stage] || testData.users.dealer_admin;
        if (!user) {
          console.log(`   ⚠️ No user for stage ${stage}, skipping...`);
          continue;
        }
        
        // Ensure user has roleDetails loaded
        if (!user.roleDetails) {
          await user.reload({ 
            include: [{ model: Role, as: 'roleDetails' }],
            transaction: t 
          });
        }
        
        // Check if user can approve at this stage
        const currentStage = currentOrder.approvalStage;
        if (currentStage !== stage) {
          console.log(`   ⚠️ Order is at stage "${currentStage}", not "${stage}". Skipping...`);
          continue;
        }
        
        try {
          const result = await WorkflowService.approve('order', currentOrder, user, {
            remarks: `Auto-approved at ${stage}`,
            transaction: t
          });
          
          // Reload order
          await currentOrder.reload({ transaction: t });
          
          if (result.isFinal) {
            console.log(`   ✅ Final approval at ${stage}: Order fully approved`);
            console.log(`   📊 Order status: ${currentOrder.status}, approvalStatus: ${currentOrder.approvalStatus}`);
            break;
          } else {
            console.log(`   ✅ Approved at ${stage}, moved to: ${result.currentStage || 'final'}`);
            currentOrder = await Order.findByPk(testData.order.id, {
              include: [{ model: OrderItem, as: 'items' }],
              transaction: t
            });
          }
        } catch (err) {
          console.log(`   ⚠️ Could not approve at ${stage}: ${err.message}`);
          // Try to continue with next stage
        }
      }
      
      await t.commit();
      
      // Reload final order
      const finalOrder = await Order.findByPk(testData.order.id);
      if (finalOrder.status === 'Approved' && finalOrder.approvalStatus === 'approved') {
        console.log(`✅ Order fully approved: status="${finalOrder.status}"`);
        return true;
      } else {
        console.log(`⚠️ Order not fully approved: status="${finalOrder.status}", approvalStatus="${finalOrder.approvalStatus}"`);
        return false;
      }
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function testCreateInvoice() {
  console.log('\n📄 Test 4: Creating Invoice...');
  
  if (!testData.order) {
    console.log('❌ No order available');
    return null;
  }
  
  // Check order status
  const order = await Order.findByPk(testData.order.id);
  if (order.status !== 'Approved') {
    console.log(`❌ Order not approved: status="${order.status}"`);
    console.log('💡 Order must be fully approved before creating invoice');
    return null;
  }
  
  if (!testData.users.dealer_staff) {
    console.log('❌ No dealer_staff user available');
    return null;
  }
  
  try {
    const invoice = await Invoice.create({
      invoiceNumber: `INV-TEST-${Date.now()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      orderId: testData.order.id,
      dealerId: testData.dealer.id,
      baseAmount: 10000,
      taxAmount: 1800,
      totalAmount: 11800,
      balanceAmount: 11800,
      paidAmount: 0,
      status: 'unpaid',
      approvalStatus: 'pending',
      approvalStage: 'dealer_admin',
      description: 'Automated test invoice'
    });
    
    testData.invoice = invoice;
    console.log(`✅ Invoice created: ID ${invoice.id}, Balance: ${invoice.balanceAmount}`);
    return invoice.id;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testApproveInvoice() {
  console.log('\n✅ Test 5: Approving Invoice Through Workflow...');
  
  if (!testData.invoice) {
    console.log('❌ No invoice available');
    return false;
  }
  
  try {
    const t = await sequelize.transaction();
    
    try {
      const invoice = await Invoice.findByPk(testData.invoice.id, { transaction: t });
      const stages = ['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'];
      
      for (const stage of stages) {
        const user = testData.users[stage] || testData.users.dealer_admin;
        if (!user) continue;
        
        try {
          const result = await WorkflowService.approve('invoice', invoice, user, {
            remarks: `Auto-approved at ${stage}`,
            transaction: t
          });
          
          await invoice.reload({ transaction: t });
          
          if (result.isFinal) {
            console.log(`   ✅ Final approval at ${stage}: Invoice fully approved`);
            break;
          } else {
            console.log(`   ✅ Approved at ${stage}, moved to: ${result.currentStage || 'final'}`);
          }
        } catch (err) {
          console.log(`   ⚠️ Could not approve at ${stage}: ${err.message}`);
        }
      }
      
      await t.commit();
      
      const finalInvoice = await Invoice.findByPk(testData.invoice.id);
      if (finalInvoice.approvalStatus === 'approved') {
        console.log(`✅ Invoice fully approved: approvalStatus="${finalInvoice.approvalStatus}"`);
        return true;
      } else {
        console.log(`⚠️ Invoice not fully approved: approvalStatus="${finalInvoice.approvalStatus}"`);
        return false;
      }
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function testCreatePayment() {
  console.log('\n💳 Test 6: Creating Payment Request...');
  
  if (!testData.invoice) {
    console.log('❌ No invoice available');
    return null;
  }
  
  const invoice = await Invoice.findByPk(testData.invoice.id);
  if (!invoice) {
    console.log('❌ Invoice not found');
    return null;
  }
  
  if (!testData.users.dealer_staff) {
    console.log('❌ No dealer_staff user available');
    return null;
  }
  
  try {
    const payment = await PaymentRequest.create({
      invoiceId: invoice.id,
      dealerId: testData.dealer.id,
      amount: invoice.balanceAmount,
      paymentMode: 'bank_transfer',
      utrNumber: `UTR-TEST-${Date.now()}`,
      status: 'pending',
      approvalStatus: 'pending',
      approvalStage: 'dealer_admin',
      requestedBy: testData.users.dealer_staff.id
    });
    
    testData.payment = payment;
    console.log(`✅ Payment request created: ID ${payment.id}, Amount: ${payment.amount}`);
    return payment.id;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testApprovePayment() {
  console.log('\n✅ Test 7: Approving Payment Through Workflow...');
  
  if (!testData.payment) {
    console.log('❌ No payment available');
    return false;
  }
  
  try {
    const t = await sequelize.transaction();
    
    try {
      const payment = await PaymentRequest.findByPk(testData.payment.id, { transaction: t });
      const stages = ['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'finance_admin'];
      
      for (const stage of stages) {
        const user = testData.users[stage] || testData.users.dealer_admin;
        if (!user) continue;
        
        try {
          const result = await WorkflowService.approve('payment', payment, user, {
            remarks: `Auto-approved at ${stage}`,
            transaction: t
          });
          
          await payment.reload({ transaction: t });
          
          if (result.isFinal) {
            console.log(`   ✅ Final approval at ${stage}: Payment fully approved`);
            break;
          } else {
            console.log(`   ✅ Approved at ${stage}, moved to: ${result.currentStage || 'final'}`);
          }
        } catch (err) {
          console.log(`   ⚠️ Could not approve at ${stage}: ${err.message}`);
        }
      }
      
      await t.commit();
      
      const finalPayment = await PaymentRequest.findByPk(testData.payment.id);
      if (finalPayment.approvalStatus === 'approved') {
        console.log(`✅ Payment fully approved: approvalStatus="${finalPayment.approvalStatus}"`);
        return true;
      } else {
        console.log(`⚠️ Payment not fully approved: approvalStatus="${finalPayment.approvalStatus}"`);
        return false;
      }
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function runDirectDBTest() {
  console.log('🚀 Direct Database Test - Material to Payment Flow');
  console.log('='.repeat(60));
  console.log('This test creates entities directly in the database');
  console.log('to verify the complete flow logic.\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Setup
    const setupOk = await setupTestData();
    if (!setupOk) {
      console.log('\n❌ Setup failed');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Running Flow Tests...');
    console.log('='.repeat(60));
    
    // Test 1: Create Material
    const materialId = await testCreateMaterial();
    
    // Test 2: Create Order
    const orderId = await testCreateOrder();
    
    // Test 3: Approve Order
    const orderApproved = await testApproveOrder();
    
    // Test 4: Create Invoice
    const invoiceId = await testCreateInvoice();
    
    // Test 5: Approve Invoice
    const invoiceApproved = await testApproveInvoice();
    
    // Test 6: Create Payment
    const paymentId = await testCreatePayment();
    
    // Test 7: Approve Payment
    const paymentApproved = await testApprovePayment();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Material: ${materialId ? '✅' : '❌'} ${materialId || 'N/A'}`);
    console.log(`Order: ${orderId ? '✅' : '❌'} ${orderId || 'N/A'} ${orderApproved ? '(Approved)' : '(Pending)'}`);
    console.log(`Invoice: ${invoiceId ? '✅' : '❌'} ${invoiceId || 'N/A'} ${invoiceApproved ? '(Approved)' : '(Pending)'}`);
    console.log(`Payment: ${paymentId ? '✅' : '❌'} ${paymentId || 'N/A'} ${paymentApproved ? '(Approved)' : '(Pending)'}`);
    console.log('='.repeat(60));
    
    if (materialId && orderId && invoiceId && paymentId) {
      console.log('\n✅ Complete flow tested successfully!');
      console.log('\n📋 Created Entities:');
      console.log(`   Material ID: ${materialId}`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Invoice ID: ${invoiceId}`);
      console.log(`   Payment ID: ${paymentId}`);
    } else {
      console.log('\n⚠️ Flow incomplete - some steps failed');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run test
if (require.main === module) {
  runDirectDBTest()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runDirectDBTest };

