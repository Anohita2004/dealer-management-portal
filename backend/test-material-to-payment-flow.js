// Test script for Material Creation to Payment Flow
// Run: node test-material-to-payment-flow.js

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test users - using seedHierarchy.js defaults
const TEST_USERS = {
  inventory_user: {
    id: null,
    token: null,
    username: 'inventory_user',
    password: 'Inventory@123'
  },
  dealer_staff: {
    id: null,
    token: null,
    username: 'staff_d001', // From seedHierarchy
    password: 'password123',
    dealerId: null
  },
  dealer_admin: {
    id: null,
    token: null,
    username: 'dealer_admin_d001', // From seedHierarchy
    password: 'password123',
    dealerId: null
  },
  territory_manager: {
    id: null,
    token: null,
    username: 'territory_manager_t1', // From seedHierarchy
    password: 'password123'
  },
  area_manager: {
    id: null,
    token: null,
    username: 'area_manager_na1', // From seedHierarchy
    password: 'password123'
  },
  regional_manager: {
    id: null,
    token: null,
    username: 'regional_manager_north', // Try common pattern
    password: 'password123'
  },
  regional_admin: {
    id: null,
    token: null,
    username: 'regional_admin_north', // From seedHierarchy
    password: 'password123'
  },
  finance_admin: {
    id: null,
    token: null,
    username: 'finance_admin', // Try common pattern
    password: 'password123'
  },
  super_admin: {
    id: null,
    token: null,
    username: 'superadmin', // From seedHierarchy
    password: 'password123'
  }
};

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, token, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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

// Step 1: Login users
async function loginUsers() {
  console.log('\n🔐 Step 1: Logging in users...');
  
  const loginResults = {
    success: [],
    failed: []
  };
  
  for (const [role, user] of Object.entries(TEST_USERS)) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: user.username,
        password: user.password
      }, {
        timeout: 5000
      });
      
      if (response.data.token) {
        user.token = response.data.token;
        user.id = response.data.user?.id;
        user.dealerId = response.data.user?.dealerId;
        console.log(`✅ ${role} logged in successfully (${user.username})`);
        loginResults.success.push(role);
      } else {
        console.log(`❌ ${role} login failed: No token received`);
        loginResults.failed.push(role);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.log(`❌ ${role} login failed (${user.username}): ${errorMsg}`);
      loginResults.failed.push(role);
      
      // Try alternative usernames for some roles
      if (role === 'inventory_user' && error.response?.status === 401) {
        console.log(`   Trying alternative: inventory_user with Inventory@123`);
      }
    }
  }
  
  console.log(`\n📊 Login Summary: ${loginResults.success.length} successful, ${loginResults.failed.length} failed`);
  return loginResults;
}

// Step 2: Create Material
async function createMaterial(token) {
  console.log('\n📦 Step 2: Creating material...');
  
  const materialData = {
    materialCode: `MAT-TEST-${Date.now()}`,
    materialName: 'Test Material',
    description: 'Test material for flow testing',
    unit: 'PCS',
    unitPrice: 1000,
    category: 'Test Category',
    isActive: true
  };
  
  const result = await apiRequest('POST', '/materials', token, materialData);
  
  if (result.success) {
    console.log('✅ Material created:', result.data.id || result.data.material?.id);
    return result.data.id || result.data.material?.id;
  } else {
    console.log('❌ Material creation failed:', result.error);
    return null;
  }
}

// Step 3: Create Order
async function createOrder(materialId, token) {
  console.log('\n🛒 Step 3: Creating order...');
  
  if (!materialId) {
    console.log('❌ Cannot create order: No material ID');
    return null;
  }
  
  const orderData = {
    items: [
      {
        materialId: materialId,
        qty: 10,
        unitPrice: 1000
      }
    ],
    notes: 'Test order for flow testing'
  };
  
  const result = await apiRequest('POST', '/orders', token, orderData);
  
  if (result.success) {
    console.log('✅ Order created:', result.data.orderId || result.data.id);
    return result.data.orderId || result.data.id;
  } else {
    console.log('❌ Order creation failed:', result.error);
    return null;
  }
}

// Step 4: Approve Order through workflow
async function approveOrder(orderId) {
  console.log('\n✅ Step 4: Approving order through workflow...');
  
  if (!orderId) {
    console.log('❌ Cannot approve order: No order ID');
    return false;
  }
  
  const approvers = [
    { role: 'dealer_admin', name: 'Dealer Admin' },
    { role: 'territory_manager', name: 'Territory Manager' },
    { role: 'area_manager', name: 'Area Manager' },
    { role: 'regional_manager', name: 'Regional Manager' },
    { role: 'regional_admin', name: 'Regional Admin' }
  ];
  
  for (const approver of approvers) {
    const result = await apiRequest('PATCH', `/orders/${orderId}/approve`, TEST_USERS[approver.role].token);
    
    if (result.success) {
      console.log(`✅ Approved by ${approver.name}`);
      
      // Check if order is fully approved
      const statusResult = await apiRequest('GET', `/orders/${orderId}/workflow`, TEST_USERS.dealer_staff.token);
      if (statusResult.success && statusResult.data.approvalStatus === 'approved') {
        console.log('✅ Order fully approved!');
        return true;
      }
    } else {
      console.log(`⚠️ ${approver.name} approval: ${result.error?.error || 'Skipped (may not be required)'}`);
    }
  }
  
  return false;
}

// Step 5: Create Invoice from Order
async function createInvoice(orderId, token) {
  console.log('\n📄 Step 5: Creating invoice from order...');
  
  if (!orderId) {
    console.log('❌ Cannot create invoice: No order ID');
    return null;
  }
  
  // First check order status
  const orderCheck = await apiRequest('GET', `/orders/${orderId}`, token);
  if (orderCheck.success) {
    const order = orderCheck.data.order || orderCheck.data;
    console.log(`   Order status: ${order.status}, approvalStatus: ${order.approvalStatus}`);
    if (order.status !== 'Approved') {
      console.log('   ⚠️ Warning: Order status is not "Approved". Invoice creation may fail.');
    }
  }
  
  const invoiceData = {
    orderId: orderId,
    invoiceNumber: `INV-TEST-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    baseAmount: 10000,
    taxAmount: 1800,
    description: 'Test invoice'
  };
  
  const result = await apiRequest('POST', '/invoices', token, invoiceData);
  
  if (result.success) {
    console.log('✅ Invoice created:', result.data.id || result.data.invoice?.id);
    return result.data.id || result.data.invoice?.id;
  } else {
    console.log('❌ Invoice creation failed:', result.error);
    if (result.error?.error?.includes('approved')) {
      console.log('   💡 Order must be fully approved before creating invoice');
    }
    return null;
  }
}

// Step 6: Approve Invoice through workflow
async function approveInvoice(invoiceId) {
  console.log('\n✅ Step 6: Approving invoice through workflow...');
  
  if (!invoiceId) {
    console.log('❌ Cannot approve invoice: No invoice ID');
    return false;
  }
  
  const approvers = [
    { role: 'dealer_admin', name: 'Dealer Admin' },
    { role: 'territory_manager', name: 'Territory Manager' },
    { role: 'area_manager', name: 'Area Manager' },
    { role: 'regional_manager', name: 'Regional Manager' },
    { role: 'regional_admin', name: 'Regional Admin' }
  ];
  
  for (const approver of approvers) {
    const result = await apiRequest('PATCH', `/invoices/${invoiceId}/approve`, TEST_USERS[approver.role].token);
    
    if (result.success) {
      console.log(`✅ Approved by ${approver.name}`);
      
      // Check if invoice is fully approved
      const invoiceResult = await apiRequest('GET', `/invoices/${invoiceId}`, TEST_USERS.dealer_staff.token);
      if (invoiceResult.success && invoiceResult.data.approvalStatus === 'approved') {
        console.log('✅ Invoice fully approved!');
        return true;
      }
    } else {
      console.log(`⚠️ ${approver.name} approval: ${result.error?.error || 'Skipped (may not be required)'}`);
    }
  }
  
  return false;
}

// Step 7: Create Payment Request
async function createPaymentRequest(invoiceId, token) {
  console.log('\n💳 Step 7: Creating payment request...');
  
  if (!invoiceId) {
    console.log('❌ Cannot create payment request: No invoice ID');
    return null;
  }
  
  // First, get invoice details to get balance amount
  const invoiceResult = await apiRequest('GET', `/invoices/${invoiceId}`, token);
  
  if (!invoiceResult.success) {
    console.log('❌ Cannot fetch invoice:', invoiceResult.error);
    return null;
  }
  
  const invoice = invoiceResult.data.invoice || invoiceResult.data;
  const balanceAmount = invoice.balanceAmount || invoice.totalAmount;
  
  console.log(`   Invoice balanceAmount: ${balanceAmount}`);
  
  const paymentData = {
    invoiceId: invoiceId,
    amount: balanceAmount,
    paymentMode: 'bank_transfer',
    utrNumber: `UTR-${Date.now()}`
  };
  
  const result = await apiRequest('POST', '/payments/request', token, paymentData);
  
  if (result.success) {
    console.log('✅ Payment request created:', result.data.payment?.id || result.data.id);
    return result.data.payment?.id || result.data.id;
  } else {
    console.log('❌ Payment request creation failed:', result.error);
    if (result.error?.error?.includes('mismatch')) {
      console.log(`   💡 Amount must exactly match invoice balanceAmount: ${balanceAmount}`);
    }
    return null;
  }
}

// Step 8: Approve Payment through workflow
async function approvePayment(paymentId) {
  console.log('\n✅ Step 8: Approving payment through workflow...');
  
  if (!paymentId) {
    console.log('❌ Cannot approve payment: No payment ID');
    return false;
  }
  
  const approvers = [
    { role: 'dealer_admin', name: 'Dealer Admin' },
    { role: 'territory_manager', name: 'Territory Manager' },
    { role: 'area_manager', name: 'Area Manager' },
    { role: 'regional_manager', name: 'Regional Manager' },
    { role: 'regional_admin', name: 'Regional Admin' },
    { role: 'finance_admin', name: 'Finance Admin' }
  ];
  
  for (const approver of approvers) {
    const result = await apiRequest('POST', `/payments/${paymentId}/approve`, TEST_USERS[approver.role].token);
    
    if (result.success) {
      console.log(`✅ Approved by ${approver.name}`);
      
      // Check if payment is fully approved
      const paymentResult = await apiRequest('GET', `/payments/mine`, TEST_USERS.dealer_staff.token);
      if (paymentResult.success) {
        const payment = paymentResult.data.payments?.find(p => p.id === paymentId);
        if (payment && payment.approvalStatus === 'approved') {
          console.log('✅ Payment fully approved!');
          return true;
        }
      }
    } else {
      console.log(`⚠️ ${approver.name} approval: ${result.error?.error || 'Skipped (may not be required)'}`);
    }
  }
  
  return false;
}

// Main test flow
async function testCompleteFlow() {
  console.log('🚀 Starting Material Creation to Payment Flow Test\n');
  console.log('='.repeat(60));
  console.log(`Testing against: ${BASE_URL}\n`);
  
  // Step 1: Login
  const loginResults = await loginUsers();
  
  // Check if we have required tokens
  if (!TEST_USERS.inventory_user.token && !TEST_USERS.super_admin.token) {
    console.log('\n❌ Cannot proceed: Need inventory_user or super_admin to create materials');
    console.log('💡 Tip: Run seedHierarchy.js first to create test users');
    return { success: false, reason: 'Missing inventory user' };
  }
  
  if (!TEST_USERS.dealer_staff.token && !TEST_USERS.dealer_admin.token) {
    console.log('\n❌ Cannot proceed: Need dealer_staff or dealer_admin to create orders');
    console.log('💡 Tip: Run seedHierarchy.js first to create test users');
    return { success: false, reason: 'Missing dealer user' };
  }
  
  // Use super_admin as fallback for material creation
  const materialCreator = TEST_USERS.inventory_user.token ? TEST_USERS.inventory_user : TEST_USERS.super_admin;
  const orderCreator = TEST_USERS.dealer_staff.token ? TEST_USERS.dealer_staff : TEST_USERS.dealer_admin;
  
  console.log(`\n📝 Using ${materialCreator === TEST_USERS.inventory_user ? 'inventory_user' : 'super_admin'} for material creation`);
  console.log(`📝 Using ${orderCreator === TEST_USERS.dealer_staff ? 'dealer_staff' : 'dealer_admin'} for order creation`);
  
  // Step 2: Create Material
  const materialId = await createMaterial(materialCreator.token);
  if (!materialId) {
    console.log('\n❌ Flow stopped: Material creation failed');
    return { success: false, reason: 'Material creation failed' };
  }
  
  // Step 3: Create Order
  const orderId = await createOrder(materialId, orderCreator.token);
  if (!orderId) {
    console.log('\n❌ Flow stopped: Order creation failed');
    return { success: false, reason: 'Order creation failed' };
  }
  
  // Step 4: Approve Order
  const orderApproved = await approveOrder(orderId);
  if (!orderApproved) {
    console.log('\n⚠️ Order may not be fully approved, but continuing...');
    console.log('💡 You may need to manually approve the order through all workflow stages');
  }
  
  // Step 5: Create Invoice
  const invoiceId = await createInvoice(orderId, orderCreator.token);
  if (!invoiceId) {
    console.log('\n❌ Flow stopped: Invoice creation failed');
    console.log('💡 Make sure the order is fully approved (status = "Approved")');
    return { success: false, reason: 'Invoice creation failed', orderId };
  }
  
  // Step 6: Approve Invoice
  const invoiceApproved = await approveInvoice(invoiceId);
  if (!invoiceApproved) {
    console.log('\n⚠️ Invoice may not be fully approved, but continuing...');
    console.log('💡 You may need to manually approve the invoice through all workflow stages');
  }
  
  // Step 7: Create Payment Request
  const paymentId = await createPaymentRequest(invoiceId, orderCreator.token);
  if (!paymentId) {
    console.log('\n❌ Flow stopped: Payment request creation failed');
    return { success: false, reason: 'Payment request creation failed', invoiceId };
  }
  
  // Step 8: Approve Payment
  const paymentApproved = await approvePayment(paymentId);
  if (!paymentApproved) {
    console.log('\n⚠️ Payment may not be fully approved');
    console.log('💡 You may need to manually approve the payment through all workflow stages');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Material Created: ${materialId ? '✅' : '❌'}`);
  console.log(`Order Created: ${orderId ? '✅' : '❌'}`);
  console.log(`Order Approved: ${orderApproved ? '✅' : '⚠️'}`);
  console.log(`Invoice Created: ${invoiceId ? '✅' : '❌'}`);
  console.log(`Invoice Approved: ${invoiceApproved ? '✅' : '⚠️'}`);
  console.log(`Payment Request Created: ${paymentId ? '✅' : '❌'}`);
  console.log(`Payment Approved: ${paymentApproved ? '✅' : '⚠️'}`);
  console.log('='.repeat(60));
  
  const testResult = {
    success: materialId && orderId && invoiceId && paymentId,
    materialId,
    orderId,
    invoiceId,
    paymentId,
    orderApproved,
    invoiceApproved,
    paymentApproved
  };
  
  if (testResult.success) {
    console.log('\n✅ Core flow completed successfully!');
    console.log('⚠️ Note: Some approvals may require manual intervention based on workflow configuration.');
    console.log('\n📋 Created Entities:');
    console.log(`   Material ID: ${materialId}`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    console.log(`   Payment ID: ${paymentId}`);
  } else {
    console.log('\n❌ Flow incomplete - check errors above');
  }
  
  return testResult;
}

// Run the test
if (require.main === module) {
  testCompleteFlow()
    .then((result) => {
      if (result && result.success) {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Test completed with warnings or errors');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteFlow, TEST_USERS };

