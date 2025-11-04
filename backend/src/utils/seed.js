const { User, Dealer, Invoice, Campaign, CreditDebitNote, AccountStatement, syncDatabase } = require('../models');

const seedData = async () => {
  try {
    console.log('Starting database seeding...');

    const dealer1 = await Dealer.create({
      dealerCode: 'D001',
      businessName: 'ABC Distributors Pvt Ltd',
      contactPerson: 'Rajesh Kumar',
      email: 'rajesh@abcdist.com',
      phoneNumber: '9876543210',
      address: '123 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstNumber: '27AABCU9603R1ZM',
      panNumber: 'AABCU9603R',
      bankName: 'HDFC Bank',
      bankAccountNumber: '50100123456789',
      bankIFSC: 'HDFC0001234',
      paymentTerms: 'Net 30',
      creditLimit: 500000,
      outstandingAmount: 150000,
      territory: 'West',
      region: 'Mumbai',
      sapCustomerNumber: 'C100001',
      sapVendorNumber: 'V100001',
      isActive: true,
      isBlocked: false
    });

    const dealer2 = await Dealer.create({
      dealerCode: 'D002',
      businessName: 'XYZ Enterprises',
      contactPerson: 'Priya Sharma',
      email: 'priya@xyzent.com',
      phoneNumber: '9876543211',
      address: '456 Park Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      gstNumber: '07AABCX9603R1ZM',
      panNumber: 'AABCX9603R',
      bankName: 'ICICI Bank',
      bankAccountNumber: '60200123456789',
      bankIFSC: 'ICIC0001234',
      paymentTerms: 'Net 45',
      creditLimit: 750000,
      outstandingAmount: 200000,
      territory: 'North',
      region: 'Delhi',
      sapCustomerNumber: 'C100002',
      sapVendorNumber: 'V100002',
      isActive: true,
      isBlocked: false
    });

    const dealer3 = await Dealer.create({
      dealerCode: 'D003',
      businessName: 'PQR Trading Company',
      contactPerson: 'Amit Patel',
      email: 'amit@pqrtrading.com',
      phoneNumber: '9876543212',
      address: '789 Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      gstNumber: '29AABCP9603R1ZM',
      panNumber: 'AABCP9603R',
      bankName: 'SBI',
      bankAccountNumber: '70300123456789',
      bankIFSC: 'SBIN0001234',
      paymentTerms: 'Net 30',
      creditLimit: 600000,
      outstandingAmount: 100000,
      territory: 'South',
      region: 'Bangalore',
      sapCustomerNumber: 'C100003',
      sapVendorNumber: 'V100003',
      isActive: true,
      isBlocked: false
    });

    console.log('Dealers created successfully');

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@dealerportal.com',
      password: 'Admin@123',
      role: 'admin',
      isActive: true,
      phoneNumber: '9999999999'
    });

    const dealerUser1 = await User.create({
      username: 'dealer1',
      email: 'rajesh@abcdist.com',
      password: 'Dealer@123',
      role: 'dealer',
      dealerId: dealer1.id,
      isActive: true,
      phoneNumber: '9876543210'
    });

    const dealerUser2 = await User.create({
      username: 'dealer2',
      email: 'priya@xyzent.com',
      password: 'Dealer@123',
      role: 'dealer',
      dealerId: dealer2.id,
      isActive: true,
      phoneNumber: '9876543211'
    });

    const dealerUser3 = await User.create({
      username: 'dealer3',
      email: 'amit@pqrtrading.com',
      password: 'Dealer@123',
      role: 'dealer',
      dealerId: dealer3.id,
      isActive: true,
      phoneNumber: '9876543212'
    });

    const keyUser = await User.create({
      username: 'keyuser',
      email: 'keyuser@dealerportal.com',
      password: 'Key@123',
      role: 'key_user',
      isActive: true,
      phoneNumber: '9999999998'
    });

    const tmUser = await User.create({
      username: 'tm_west',
      email: 'tm.west@dealerportal.com',
      password: 'TM@123',
      role: 'tm',
      isActive: true,
      phoneNumber: '9999999997'
    });
    const accountsUser = await User.create({
  username: 'accounts_user',
  email: 'accounts@dealerportal.com',
  password: 'Accounts@123',
  role: 'accounts',
  isActive: true,
  phoneNumber: '9999999996'
});
const inventoryUser = await User.create({
  username: 'inventory_user',
  email: 'inventory@dealerportal.com',
  password: 'Inventory@123', // will be hashed automatically
  role: 'inventory',
  isActive: true,
  phoneNumber: '9999999976'
});


    console.log('Users created successfully');

    await Invoice.create({
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      amount: 100000,
      taxAmount: 18000,
      totalAmount: 118000,
      paidAmount: 50000,
      balanceAmount: 68000,
      status: 'partial',
      productGroup: 'Electronics',
      description: 'Electronic goods supply',
      dealerId: dealer1.id,
      sapDocumentNumber: 'SAP-INV-001'
    });

    await Invoice.create({
      invoiceNumber: 'INV-2024-002',
      invoiceDate: new Date('2024-02-01'),
      dueDate: new Date('2024-03-01'),
      amount: 150000,
      taxAmount: 27000,
      totalAmount: 177000,
      paidAmount: 0,
      balanceAmount: 177000,
      status: 'unpaid',
      productGroup: 'Appliances',
      description: 'Home appliances supply',
      dealerId: dealer1.id,
      sapDocumentNumber: 'SAP-INV-002'
    });

    await Invoice.create({
      invoiceNumber: 'INV-2024-003',
      invoiceDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-20'),
      amount: 200000,
      taxAmount: 36000,
      totalAmount: 236000,
      paidAmount: 236000,
      balanceAmount: 0,
      status: 'paid',
      productGroup: 'Electronics',
      description: 'Electronic goods supply',
      dealerId: dealer2.id,
      sapDocumentNumber: 'SAP-INV-003'
    });

    await Invoice.create({
      invoiceNumber: 'INV-2024-004',
      invoiceDate: new Date('2024-02-10'),
      dueDate: new Date('2024-03-10'),
      amount: 120000,
      taxAmount: 21600,
      totalAmount: 141600,
      paidAmount: 0,
      balanceAmount: 141600,
      status: 'unpaid',
      productGroup: 'Furniture',
      description: 'Office furniture supply',
      dealerId: dealer3.id,
      sapDocumentNumber: 'SAP-INV-004'
    });

    console.log('Invoices created successfully');

    await Campaign.create({
      campaignName: 'Summer Sale 2024',
      campaignType: 'seasonal_offer',
      description: 'Special discounts on all electronics during summer',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-06-30'),
      productGroup: 'Electronics',
      discountPercentage: 15,
      isActive: true,
      terms: 'Valid on bulk orders above 50 units'
    });

    await Campaign.create({
      campaignName: 'Festive Bonanza',
      campaignType: 'promotion',
      description: 'Festival special offers on all products',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-11-15'),
      productGroup: 'All',
      discountPercentage: 20,
      isActive: true,
      terms: 'Applicable on all product categories'
    });

    await Campaign.create({
      campaignName: 'New Year Scheme',
      campaignType: 'sales_scheme',
      description: 'Special pricing for new year',
      startDate: new Date('2024-12-15'),
      endDate: new Date('2025-01-15'),
      productGroup: 'Appliances',
      discountPercentage: 10,
      isActive: true,
      terms: 'Minimum order value Rs. 100,000'
    });

    console.log('Campaigns created successfully');

    await CreditDebitNote.create({
      noteNumber: 'CN-2024-001',
      noteType: 'credit',
      noteDate: new Date('2024-02-05'),
      amount: 5000,
      reasonCode: 'RETURN',
      description: 'Product return credit note',
      referenceInvoiceNumber: 'INV-2024-001',
      status: 'approved',
      dealerId: dealer1.id,
      sapDocumentNumber: 'SAP-CN-001'
    });

    await CreditDebitNote.create({
      noteNumber: 'DN-2024-001',
      noteType: 'debit',
      noteDate: new Date('2024-02-08'),
      amount: 2000,
      reasonCode: 'SHORTAGE',
      description: 'Shortage debit note',
      referenceInvoiceNumber: 'INV-2024-002',
      status: 'approved',
      dealerId: dealer1.id,
      sapDocumentNumber: 'SAP-DN-001'
    });

    console.log('Credit/Debit notes created successfully');

    await AccountStatement.create({
      statementDate: new Date('2024-01-01'),
      documentType: 'Opening Balance',
      documentNumber: 'OB-2024',
      description: 'Opening balance for the year',
      debitAmount: 0,
      creditAmount: 0,
      balance: 50000,
      dealerId: dealer1.id
    });

    await AccountStatement.create({
      statementDate: new Date('2024-01-15'),
      documentType: 'Invoice',
      documentNumber: 'INV-2024-001',
      description: 'Electronic goods supply',
      debitAmount: 118000,
      creditAmount: 0,
      balance: 168000,
      productGroup: 'Electronics',
      dealerId: dealer1.id,
      sapDocumentNumber: 'SAP-INV-001'
    });

    await AccountStatement.create({
      statementDate: new Date('2024-01-20'),
      documentType: 'Payment',
      documentNumber: 'PMT-2024-001',
      description: 'Payment received',
      debitAmount: 0,
      creditAmount: 50000,
      balance: 118000,
      dealerId: dealer1.id
    });

    console.log('Account statements created successfully');

    console.log('\n=== Database seeding completed successfully ===');
    console.log('\nTest Credentials:');
    console.log('Admin: username=admin, password=Admin@123');
    console.log('Dealer 1: username=dealer1, password=Dealer@123');
    console.log('Dealer 2: username=dealer2, password=Dealer@123');
    console.log('Dealer 3: username=dealer3, password=Dealer@123');
    console.log('Key User: username=keyuser, password=Key@123');
    console.log('TM: username=tm_west, password=TM@123');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

if (require.main === module) {
  syncDatabase().then(() => {
    seedData().then(() => {
      console.log('Seeding completed');
      process.exit(0);
    }).catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
  });
}

module.exports = { seedData };
