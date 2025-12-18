// Automated test for Material to Payment Flow
// This script checks the database for existing users and uses them, or creates test data

const axios = require('axios');
const { sequelize, User, Role, Material, Order, Invoice, PaymentRequest, Dealer } = require('./src/models');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

let testUsers = {};
let createdEntities = {
  materialId: null,
  orderId: null,
  invoiceId: null,
  paymentId: null
};

// Helper to make API requests
async function apiRequest(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Find or create test users
async function setupTestUsers() {
  console.log('\n🔍 Finding test users in database...\n');
  
  try {
    // Get roles
    const roles = await Role.findAll();
    const roleMap = {};
    roles.forEach(r => roleMap[r.name] = r);
    
    // Find users by role
    const findUserByRole = async (roleName) => {
      const role = roleMap[roleName];
      if (!role) return null;
      
      const user = await User.findOne({
        where: { roleId: role.id, isActive: true },
        include: [{ model: Role, as: 'roleDetails' }]
      });
      return user;
    };
    
    // Try to find users
    const inventoryUser = await findUserByRole('inventory_user');
    const dealerStaff = await findUserByRole('dealer_staff');
    const dealerAdmin = await findUserByRole('dealer_admin');
    const territoryManager = await findUserByRole('territory_manager');
    const areaManager = await findUserByRole('area_manager');
    const regionalManager = await findUserByRole('regional_manager');
    const regionalAdmin = await findUserByRole('regional_admin');
    const financeAdmin = await findUserByRole('finance_admin');
    const superAdmin = await findUserByRole('super_admin');
    
    // Login users
    const loginUser = async (user, roleName) => {
      if (!user) {
        console.log(`   ⚠️ ${roleName}: Not found`);
        return null;
      }
      
      // Try common passwords
      const passwords = ['password123', 'Password@123', 'Inventory@123', 'Dealer@123', 'Admin@123'];
      
      for (const password of passwords) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: user.username,
            password: password
          }, { timeout: 5000 });
          
          if (response.data.token) {
            console.log(`   ✅ ${roleName}: ${user.username} (logged in)`);
            return {
              id: user.id,
              token: response.data.token,
              username: user.username,
              dealerId: user.dealerId,
              regionId: user.regionId
            };
          }
        } catch (err) {
          // Try next password
        }
      }
      
      console.log(`   ⚠️ ${roleName}: ${user.username} (login failed - try manual login)`);
      return null;
    };
    
    testUsers.inventory_user = await loginUser(inventoryUser, 'inventory_user');
    testUsers.dealer_staff = await loginUser(dealerStaff, 'dealer_staff');
    testUsers.dealer_admin = await loginUser(dealerAdmin, 'dealer_admin');
    testUsers.territory_manager = await loginUser(territoryManager, 'territory_manager');
    testUsers.area_manager = await loginUser(areaManager, 'area_manager');
    testUsers.regional_manager = await loginUser(regionalManager, 'regional_manager');
    testUsers.regional_admin = await loginUser(regionalAdmin, 'regional_admin');
    testUsers.finance_admin = await loginUser(financeAdmin, 'finance_admin');
    testUsers.super_admin = await loginUser(superAdmin, 'super_admin');
    
    return testUsers;
  } catch (error) {
    console.error('Error setting up users:', error);
    return null;
  }
}

// Test 1: Create Material
async function testCreateMaterial() {
  console.log('\n📦 Test 1: Creating Material...');
  
  const user = testUsers.inventory_user || testUsers.super_admin;
  if (!user || !user.token) {
    console.log('   ❌ No user available to create material');
    return null;
  }
  
  const materialData = {
    materialCode: `MAT-AUTO-${Date.now()}`,
    materialName: 'Auto Test Material',
    description: 'Automated test material',
    unit: 'PCS',
    unitPrice: 1000,
    category: 'Test',
    isActive: true
  };
  
  const result = await apiRequest('POST', '/materials', user.token, materialData);
  
  if (result.success) {
    const materialId = result.data.id || result.data.material?.id;
    console.log(`   ✅ Material created: ${materialId}`);
    createdEntities.materialId = materialId;
    return materialId;
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    return null;
  }
}

// Test 2: Create Order
async function testCreateOrder(materialId) {
  console.log('\n🛒 Test 2: Creating Order...');
  
  if (!materialId) {
    console.log('   ❌ No material ID');
    return null;
  }
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) {
    console.log('   ❌ No dealer user available');
    return null;
  }
  
  const orderData = {
    items: [{
      materialId: materialId,
      qty: 10,
      unitPrice: 1000
    }],
    notes: 'Automated test order'
  };
  
  const result = await apiRequest('POST', '/orders', user.token, orderData);
  
  if (result.success) {
    const orderId = result.data.orderId || result.data.id;
    console.log(`   ✅ Order created: ${orderId}`);
    console.log(`   📊 Approval Stage: ${result.data.approvalStage || 'N/A'}`);
    createdEntities.orderId = orderId;
    return orderId;
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    return null;
  }
}

// Test 3: Check Order Status
async function testCheckOrderStatus(orderId) {
  console.log('\n🔍 Test 3: Checking Order Status...');
  
  if (!orderId) return false;
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) return false;
  
  const result = await apiRequest('GET', `/orders/${orderId}`, user.token);
  
  if (result.success) {
    const order = result.data.order || result.data;
    console.log(`   📊 Status: ${order.status}`);
    console.log(`   📊 Approval Status: ${order.approvalStatus}`);
    console.log(`   📊 Approval Stage: ${order.approvalStage || 'None (fully approved)'}`);
    
    if (order.status === 'Approved' && order.approvalStatus === 'approved') {
      console.log('   ✅ Order is fully approved and ready for invoice creation');
      return true;
    } else {
      console.log('   ⚠️ Order is not fully approved yet');
      console.log('   💡 You need to approve through workflow stages:');
      console.log('      dealer_admin → territory_manager → area_manager → regional_manager → regional_admin');
      return false;
    }
  } else {
    console.log(`   ❌ Failed to check order: ${result.error?.error || result.error}`);
    return false;
  }
}

// Test 4: Create Invoice
async function testCreateInvoice(orderId) {
  console.log('\n📄 Test 4: Creating Invoice...');
  
  if (!orderId) {
    console.log('   ❌ No order ID');
    return null;
  }
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) {
    console.log('   ❌ No dealer user available');
    return null;
  }
  
  // Check order status first
  const orderCheck = await apiRequest('GET', `/orders/${orderId}`, user.token);
  if (orderCheck.success) {
    const order = orderCheck.data.order || orderCheck.data;
    if (order.status !== 'Approved') {
      console.log(`   ⚠️ Order status is "${order.status}", not "Approved"`);
      console.log('   💡 Invoice creation will fail. Order must be fully approved first.');
      return null;
    }
  }
  
  const invoiceData = {
    orderId: orderId,
    invoiceNumber: `INV-AUTO-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    baseAmount: 10000,
    taxAmount: 1800,
    description: 'Automated test invoice'
  };
  
  const result = await apiRequest('POST', '/invoices', user.token, invoiceData);
  
  if (result.success) {
    const invoiceId = result.data.id || result.data.invoice?.id;
    console.log(`   ✅ Invoice created: ${invoiceId}`);
    createdEntities.invoiceId = invoiceId;
    return invoiceId;
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    if (result.error?.error?.includes('approved')) {
      console.log('   💡 Order must be fully approved (status = "Approved") before creating invoice');
    }
    return null;
  }
}

// Test 5: Check Invoice Status
async function testCheckInvoiceStatus(invoiceId) {
  console.log('\n🔍 Test 5: Checking Invoice Status...');
  
  if (!invoiceId) return false;
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) return false;
  
  const result = await apiRequest('GET', `/invoices/${invoiceId}`, user.token);
  
  if (result.success) {
    const invoice = result.data.invoice || result.data;
    console.log(`   📊 Approval Status: ${invoice.approvalStatus}`);
    console.log(`   📊 Approval Stage: ${invoice.approvalStage || 'None (fully approved)'}`);
    console.log(`   📊 Balance Amount: ${invoice.balanceAmount || invoice.totalAmount}`);
    return true;
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    return false;
  }
}

// Test 6: Create Payment Request
async function testCreatePayment(invoiceId) {
  console.log('\n💳 Test 6: Creating Payment Request...');
  
  if (!invoiceId) {
    console.log('   ❌ No invoice ID');
    return null;
  }
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) {
    console.log('   ❌ No dealer user available');
    return null;
  }
  
  // Get invoice to get balance amount
  const invoiceResult = await apiRequest('GET', `/invoices/${invoiceId}`, user.token);
  if (!invoiceResult.success) {
    console.log(`   ❌ Cannot fetch invoice: ${invoiceResult.error?.error || invoiceResult.error}`);
    return null;
  }
  
  const invoice = invoiceResult.data.invoice || invoiceResult.data;
  const balanceAmount = invoice.balanceAmount || invoice.totalAmount;
  
  console.log(`   💰 Invoice Balance Amount: ${balanceAmount}`);
  
  const paymentData = {
    invoiceId: invoiceId,
    amount: balanceAmount,
    paymentMode: 'bank_transfer',
    utrNumber: `UTR-AUTO-${Date.now()}`
  };
  
  const result = await apiRequest('POST', '/payments/request', user.token, paymentData);
  
  if (result.success) {
    const paymentId = result.data.payment?.id || result.data.id;
    console.log(`   ✅ Payment request created: ${paymentId}`);
    createdEntities.paymentId = paymentId;
    return paymentId;
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    if (result.error?.error?.includes('mismatch')) {
      console.log(`   💡 Amount must exactly match balanceAmount: ${balanceAmount}`);
    }
    return null;
  }
}

// Test 7: Check Payment Status
async function testCheckPaymentStatus(paymentId) {
  console.log('\n🔍 Test 7: Checking Payment Status...');
  
  if (!paymentId) return false;
  
  const user = testUsers.dealer_staff || testUsers.dealer_admin;
  if (!user || !user.token) return false;
  
  const result = await apiRequest('GET', '/payments/mine', user.token);
  
  if (result.success) {
    const payments = result.data.payments || result.data;
    const payment = Array.isArray(payments) 
      ? payments.find(p => p.id === paymentId)
      : payments;
    
    if (payment) {
      console.log(`   📊 Approval Status: ${payment.approvalStatus}`);
      console.log(`   📊 Approval Stage: ${payment.approvalStage || 'None (fully approved)'}`);
      console.log(`   📊 Status: ${payment.status}`);
      return true;
    } else {
      console.log('   ⚠️ Payment not found in user\'s payment list');
      return false;
    }
  } else {
    console.log(`   ❌ Failed: ${result.error?.error || result.error}`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Automated Material-to-Payment Flow Test');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}\n`);
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Setup test users
    const users = await setupTestUsers();
    if (!users) {
      console.log('\n❌ Failed to setup test users');
      return;
    }
    
    // Check if we have minimum required users
    const hasMaterialCreator = testUsers.inventory_user || testUsers.super_admin;
    const hasOrderCreator = testUsers.dealer_staff || testUsers.dealer_admin;
    
    if (!hasMaterialCreator) {
      console.log('\n❌ No user available to create materials');
      console.log('💡 Create an inventory_user or super_admin user first');
      return;
    }
    
    if (!hasOrderCreator) {
      console.log('\n❌ No user available to create orders');
      console.log('💡 Create a dealer_staff or dealer_admin user first');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Running Flow Tests...');
    console.log('='.repeat(60));
    
    // Test 1: Create Material
    const materialId = await testCreateMaterial();
    
    // Test 2: Create Order
    const orderId = await testCreateOrder(materialId);
    
    // Test 3: Check Order Status
    const orderReady = await testCheckOrderStatus(orderId);
    
    // Test 4: Create Invoice (only if order is approved)
    let invoiceId = null;
    if (orderReady) {
      invoiceId = await testCreateInvoice(orderId);
    } else {
      console.log('\n⏭️ Skipping invoice creation - order not approved');
      console.log('💡 Approve the order through workflow stages first');
    }
    
    // Test 5: Check Invoice Status
    if (invoiceId) {
      await testCheckInvoiceStatus(invoiceId);
    }
    
    // Test 6: Create Payment Request
    let paymentId = null;
    if (invoiceId) {
      paymentId = await testCreatePayment(invoiceId);
    } else {
      console.log('\n⏭️ Skipping payment creation - no invoice');
    }
    
    // Test 7: Check Payment Status
    if (paymentId) {
      await testCheckPaymentStatus(paymentId);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Material Created: ${materialId ? '✅' : '❌'} ${materialId || 'N/A'}`);
    console.log(`Order Created: ${orderId ? '✅' : '❌'} ${orderId || 'N/A'}`);
    console.log(`Order Approved: ${orderReady ? '✅' : '⚠️ (Needs manual approval)'}`);
    console.log(`Invoice Created: ${invoiceId ? '✅' : '❌'} ${invoiceId || 'N/A'}`);
    console.log(`Payment Created: ${paymentId ? '✅' : '❌'} ${paymentId || 'N/A'}`);
    console.log('='.repeat(60));
    
    if (materialId && orderId) {
      console.log('\n✅ Core entities created successfully!');
      if (!orderReady) {
        console.log('\n💡 Next Steps:');
        console.log('   1. Approve the order through all workflow stages');
        console.log('   2. Then create invoice from the approved order');
        console.log('   3. Approve invoice through workflow');
        console.log('   4. Create payment request');
        console.log('   5. Approve payment through workflow');
      }
    } else {
      console.log('\n❌ Flow incomplete - check errors above');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };

