const { Dealer, Invoice, CreditDebitNote, AccountStatement, AuditLog } = require('../models');


const syncDealers = async (req, res) => {
  try {
    const mockSAPDealers = [
      {
        dealerCode: 'D001',
        businessName: 'ABC Distributors',
        sapCustomerNumber: 'C100001',
        sapVendorNumber: 'V100001',
        email: 'abc@example.com',
        phoneNumber: '9876543210',
        address: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        gstNumber: '27AABCU9603R1ZM',
        panNumber: 'AABCU9603R',
        territory: 'West',
        region: 'Mumbai'
      }
    ];

    const syncedDealers = [];
    for (const sapDealer of mockSAPDealers) {
      const [dealer, created] = await Dealer.findOrCreate({
        where: { dealerCode: sapDealer.dealerCode },
        defaults: sapDealer
      });

      if (!created) {
        await dealer.update(sapDealer);
      }

      syncedDealers.push(dealer);
    }

    await AuditLog.create({
      userId: req.user?.id,
      action: 'SAP_DEALER_SYNC',
      entity: 'Dealer',
      changes: { syncedCount: syncedDealers.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      message: 'Dealers synced successfully',
      syncedCount: syncedDealers.length,
      dealers: syncedDealers
    });
  } catch (error) {
    console.error('SAP dealer sync error:', error);
    res.status(500).json({ error: 'Failed to sync dealers from SAP' });
  }
};

const fetchCustomerAccount = async (req, res) => {
  try {
    const { dealerId } = req.params;
    
    const dealer = await Dealer.findByPk(dealerId);
    
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const mockAccountData = {
      customerNumber: dealer.sapCustomerNumber,
      openingBalance: 50000,
      currentBalance: dealer.outstandingAmount,
      creditLimit: dealer.creditLimit,
      lastTransactionDate: new Date()
    };

    res.json(mockAccountData);
  } catch (error) {
    console.error('SAP customer account fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch customer account from SAP' });
  }
};

const fetchVendorAccount = async (req, res) => {
  try {
    const { dealerId } = req.params;
    
    const dealer = await Dealer.findByPk(dealerId);
    
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const mockVendorData = {
      vendorNumber: dealer.sapVendorNumber,
      paymentTerms: dealer.paymentTerms,
      bankDetails: {
        bankName: dealer.bankName,
        accountNumber: dealer.bankAccountNumber,
        ifsc: dealer.bankIFSC
      }
    };

    res.json(mockVendorData);
  } catch (error) {
    console.error('SAP vendor account fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor account from SAP' });
  }
};

const createCreditDebitNote = async (req, res) => {
  try {
    const { dealerId, noteType, amount, reasonCode, description } = req.body;

    const dealer = await Dealer.findByPk(dealerId);
    
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const noteNumber = `${noteType === 'credit' ? 'CN' : 'DN'}-${Date.now()}`;
    
    const note = await CreditDebitNote.create({
      noteNumber,
      noteType,
      noteDate: new Date(),
      amount,
      reasonCode,
      description,
      dealerId,
      sapDocumentNumber: `SAP-${noteNumber}`,
      status: 'approved'
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'SAP_CREATE_NOTE',
      entity: 'CreditDebitNote',
      entityId: note.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Credit/Debit note created in SAP',
      note
    });
  } catch (error) {
    console.error('SAP create note error:', error);
    res.status(500).json({ error: 'Failed to create credit/debit note in SAP' });
  }
};

const syncInvoices = async (req, res) => {
  try {
    const { dealerId } = req.params;
    
    const dealer = await Dealer.findByPk(dealerId);
    
    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const mockSAPInvoices = [
      {
        invoiceNumber: `INV-${Date.now()}-001`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 100000,
        taxAmount: 18000,
        totalAmount: 118000,
        paidAmount: 0,
        balanceAmount: 118000,
        status: 'unpaid',
        productGroup: 'Electronics',
        description: 'Product sales invoice',
        sapDocumentNumber: `SAP-INV-${Date.now()}`,
        dealerId: dealer.id
      }
    ];

    const syncedInvoices = [];
    for (const sapInvoice of mockSAPInvoices) {
      const [invoice, created] = await Invoice.findOrCreate({
        where: { invoiceNumber: sapInvoice.invoiceNumber },
        defaults: sapInvoice
      });

      syncedInvoices.push(invoice);
    }

    await AuditLog.create({
      userId: req.user?.id,
      action: 'SAP_INVOICE_SYNC',
      entity: 'Invoice',
      changes: { dealerId, syncedCount: syncedInvoices.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      message: 'Invoices synced successfully from SAP',
      syncedCount: syncedInvoices.length,
      invoices: syncedInvoices
    });
  } catch (error) {
    console.error('SAP invoice sync error:', error);
    res.status(500).json({ error: 'Failed to sync invoices from SAP' });
  }
};

module.exports = {
  syncDealers,
  fetchCustomerAccount,
  fetchVendorAccount,
  createCreditDebitNote,
  syncInvoices
};
