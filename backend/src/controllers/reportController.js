// =======================================================
// ✅ REPORT CONTROLLER (CLEAN + FIXED + OPTIMIZED)
// =======================================================

const {
  Dealer,
  Invoice,
  CreditDebitNote,
  AccountStatement,
  AuditLog,
  Document,
  Campaign,
  PricingUpdate,   // ✅ The correct model
  Order,
  PaymentRequest,
  Region,
  Area,
  Territory,
  Inventory,
  Material,
  RakeArrival,
  RailwayReceipt,
  sequelize,
} = require("../models");

const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const RBACEngine = require("../services/rbacEngine");

// -------------------------------------------------
// Helpers for dashboards
// -------------------------------------------------
const isReportLocked = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  // Return true if it's the last 3 days of the month
  return (lastDay - currentDay) < 3;
};

const buildDealerWhere = async (req) => {
  // Use RBAC engine for scoping
  if (req.scope?.dealer) {
    return { ...req.scope.dealer };
  }

  const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Dealer');
  return scopeWhere;
};

const dashboardSummary = async (dealerWhere = {}, user = null) => {
  const dealers = await Dealer.findAll({
    where: dealerWhere,
    attributes: ["id"],
  });
  const dealerIds = dealers.map((d) => d.id);
  const dealerIdList = dealerIds.length ? { dealerId: { [Op.in]: dealerIds } } : {};

  const [invoiceAgg] = await Invoice.findAll({
    where: dealerIdList,
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "totalInvoices"],
      [sequelize.fn("SUM", sequelize.col("balanceAmount")), "outstanding"],
    ],
    raw: true,
  });

  const outstanding = Number(invoiceAgg?.outstanding || 0);
  const totalInvoices = Number(invoiceAgg?.totalInvoices || 0);

  // Workflow counts based on user's role
  const roleName = user?.roleDetails?.name || user?.role;
  const { getPipeline } = require("../services/workflow/pipelines");

  const workflowCondition = {
    approvalStage: roleName,
    approvalStatus: 'pending'
  };

  const pendingOrders = getPipeline('order').includes(roleName) ? await Order.count({ where: { ...dealerIdList, ...workflowCondition } }) : 0;
  const pendingInvoices = getPipeline('invoice').includes(roleName) ? await Invoice.count({ where: { ...dealerIdList, ...workflowCondition } }) : 0;
  const pendingPayments = getPipeline('payment').includes(roleName) ? await PaymentRequest.count({ where: { ...dealerIdList, ...workflowCondition } }) : 0;
  const pendingDocs = getPipeline('document').includes(roleName) ? await Document.count({ where: { ...dealerIdList, ...workflowCondition } }) : 0;
  const pendingPricing = getPipeline('pricing').includes(roleName) ? await PricingUpdate.count({ where: { ...dealerIdList, ...workflowCondition } }) : 0;
  const pendingDealers = getPipeline('dealer').includes(roleName) ? await Dealer.count({ where: { ...(dealerIds.length ? { id: { [Op.in]: dealerIds } } : {}), ...workflowCondition } }) : 0;

  const activeCampaigns = await Campaign.count({
    where: {
      isActive: true,
      ...(dealerWhere.regionId ? { regionId: dealerWhere.regionId } : {}),
      ...(dealerWhere.areaId ? { areaId: dealerWhere.areaId } : {}),
      ...(dealerWhere.territoryId ? { territoryId: dealerWhere.territoryId } : {}),
    },
  });

  return {
    dealers: dealerIds.length,
    totalInvoices,
    totalOutstanding: outstanding,
    approvalsPending: pendingOrders + pendingInvoices + pendingPayments + pendingDocs + pendingPricing + pendingDealers,
    activeCampaigns,
  };
};

const getSuperDashboard = async (req, res) => {
  try {
    const summary = await dashboardSummary({}, req.user);
    res.json(summary);
  } catch (err) {
    console.error("Super dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};

const getRegionalDashboard = async (req, res) => {
  try {
    const scope = RBACEngine.getUserScope(req.user);
    if (!scope.regionId) return res.status(400).json({ error: "regionId missing" });
    const summary = await dashboardSummary({ regionId: scope.regionId }, req.user);
    res.json(summary);
  } catch (err) {
    console.error("Regional dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};

const getManagerDashboard = async (req, res) => {
  try {
    const where = await buildDealerWhere(req);
    const role = req.user.roleDetails?.name || req.user.role;
    if (
      ["territory_manager", "area_manager", "regional_manager"].includes(role) &&
      !Object.keys(where).length
    ) {
      return res.status(400).json({ error: "Missing scoped ids for manager" });
    }
    const summary = await dashboardSummary(where, req.user);
    res.json(summary);
  } catch (err) {
    console.error("Manager dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};

const getDealerDashboard = async (req, res) => {
  try {
    // Get dealerId from user directly (for dealer_admin and dealer_staff)
    let dealerId = req.user.dealerId;
    if (!dealerId) {
      // Fallback to scope if dealerId not directly on user
      try {
        const scope = RBACEngine.getUserScope(req.user);
        if (scope && scope.dealerId) {
          dealerId = scope.dealerId;
        }
      } catch (scopeErr) {
        console.warn("Failed to get user scope:", scopeErr.message);
      }

      if (!dealerId) {
        return res.status(400).json({
          error: "dealerId missing. User must be dealer_admin or dealer_staff with a valid dealerId."
        });
      }
    }

    // Get date range from query params (optional)
    const { startDate, endDate } = req.query;
    const dateWhere = {};
    if (startDate && endDate) {
      dateWhere.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get dealer info
    const dealer = await Dealer.findByPk(dealerId, {
      attributes: ['id', 'dealerCode', 'businessName', 'outstandingAmount']
    });

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Get invoices with optional date filter
    const invoiceWhere = { dealerId, ...dateWhere };
    const invoices = await Invoice.findAll({
      where: invoiceWhere,
      order: [["invoiceDate", "DESC"]],
    });

    // Calculate totals
    const totalSales = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0),
      0
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + Number(inv.paidAmount || 0),
      0
    );
    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + Number(inv.balanceAmount || 0),
      0
    );

    // Count invoices by status
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid').length;
    const partialInvoices = invoices.filter(inv => inv.status === 'partial').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

    // Get orders count and list
    const orders = await Order.findAll({
      where: { dealerId, ...(dateWhere.orderDate ? { orderDate: dateWhere.invoiceDate } : {}) },
      order: [["createdAt", "DESC"]],
      limit: 50 // Limit for dashboard display
    });
    const ordersCount = orders.length;

    // Get pending documents
    const pendingDocs = await Document.count({
      where: { dealerId, status: "pending" }
    });

    // Get pending pricing requests
    const pendingPricing = await PricingUpdate.count({
      where: { dealerId, status: "pending" }
    });

    // Get active campaigns for this dealer
    let activeCampaigns = 0;
    try {
      activeCampaigns = await Campaign.count({
        where: {
          isActive: true,
          targetAudience: {
            [Op.contains]: [{ type: 'dealer', entityId: dealerId }]
          }
        }
      });
    } catch (campaignErr) {
      // If Campaign query fails (e.g., JSONB not supported), just set to 0
      console.warn("Campaign count query failed, defaulting to 0:", campaignErr.message);
      activeCampaigns = 0;
    }

    // Monthly trend data (if date range provided)
    let monthlyTrend = [];
    if (startDate && endDate) {
      const monthlyData = {};
      invoices.forEach(inv => {
        if (!inv.invoiceDate) return; // Skip if invoiceDate is null
        try {
          const month = new Date(inv.invoiceDate).toISOString().substring(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { month, sales: 0, count: 0 };
          }
          monthlyData[month].sales += Number(inv.totalAmount || 0);
          monthlyData[month].count += 1;
        } catch (dateErr) {
          // Skip invalid dates
          console.warn("Invalid invoice date:", inv.invoiceDate);
        }
      });
      monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }

    res.json({
      dealer: {
        id: dealer.id,
        dealerCode: dealer.dealerCode,
        businessName: dealer.businessName,
        outstandingAmount: dealer.outstandingAmount
      },
      summary: {
        totalInvoices: invoices.length,
        totalSales,
        totalPaid,
        totalOutstanding,
        ordersCount,
        approvalsPending: pendingDocs + pendingPricing,
        activeCampaigns
      },
      invoices: {
        paid: paidInvoices,
        unpaid: unpaidInvoices,
        partial: partialInvoices,
        overdue: overdueInvoices
      },
      orders: orders || [], // Array of orders for frontend filtering
      monthlyTrend,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    });
  } catch (err) {
    console.error("Dealer dashboard error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      error: "Failed to load dashboard",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// =======================================================
// ✅ DEALER PERFORMANCE REPORT
// =======================================================
const getDealerPerformanceReport = async (req, res) => {
  try {
    // ✅ If the logged-in user is a dealer → return THEIR OWN dashboard summary
    if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      const dealerId = req.user.dealerId;

      const dealer = await Dealer.findByPk(dealerId);
      if (!dealer) return res.status(404).json({ error: "Dealer not found" });

      // ✅ Fetch invoices
      const invoices = await Invoice.findAll({
        where: { dealerId },
        order: [["invoiceDate", "DESC"]],
      });

      const totalSales = invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount || 0),
        0
      );

      const deliveredOrders = invoices.filter(
        (i) => i.status === "Delivered"
      ).length;

      const pendingOrders = invoices.filter(
        (i) => i.status === "Pending"
      ).length;

      // ✅ Monthly Targets (fallback demo)
      const monthlyTarget = dealer.monthlyTarget || 200000;
      const quarterlyTarget = monthlyTarget * 3;
      const yearlyTarget = monthlyTarget * 12;

      // ✅ Category-wise sales (for pie chart)
      const productGroups = {};
      invoices.forEach((inv) => {
        const group = inv.productGroup || "Others";
        if (!productGroups[group]) productGroups[group] = 0;
        productGroups[group] += Number(inv.totalAmount || 0);
      });

      // ✅ Pricing Status counts — FULLY FIXED ✅
      const approved = await PricingUpdate.count({
        where: { dealerId, status: "approved" },
      });

      const pending = await PricingUpdate.count({
        where: { dealerId, status: "pending" },
      });

      const rejected = await PricingUpdate.count({
        where: { dealerId, status: "rejected" },
      });

      const pricingBreakdown = { approved, pending, rejected };

      // ✅ Return Dealer Dashboard JSON
      return res.json({
        dealerName: dealer.businessName,
        dealerCode: dealer.dealerCode,
        totalSales,
        monthlyTarget,
        quarterlyTarget,
        yearlyTarget,
        deliveredOrders,
        pendingOrders,
        productGroups,
        pricingBreakdown,
      });
    }

    // ✅ Admin Report (scoped dealers)
    const dealerWhere = await buildDealerWhere(req);
    const dealers = await Dealer.findAll({
      where: dealerWhere,
      include: [{ model: Invoice, as: "invoices" }],
    });

    const reportData = dealers.map((dealer) => {
      const invoices = dealer.invoices || [];
      const totalSales = invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount || 0),
        0
      );

      const deliveredOrders = invoices.filter(
        (i) => i.status === "Delivered"
      ).length;

      const pendingOrders = invoices.filter(
        (i) => i.status === "Pending"
      ).length;

      const monthlyTarget = dealer.monthlyTarget || 200000;
      const quarterlyTarget = monthlyTarget * 3;
      const yearlyTarget = monthlyTarget * 12;

      const productGroups = {};
      invoices.forEach((inv) => {
        const group = inv.productGroup || "Others";
        if (!productGroups[group]) productGroups[group] = 0;
        productGroups[group] += Number(inv.totalAmount || 0);
      });

      return {
        dealerName: dealer.businessName,
        dealerCode: dealer.dealerCode,
        totalSales,
        monthlyTarget,
        quarterlyTarget,
        yearlyTarget,
        deliveredOrders,
        pendingOrders,
        productGroups,
      };
    });

    return res.json(reportData);
  } catch (error) {
    console.error("Dealer performance error:", error);
    res.status(500).json({ error: "Failed to generate dealer performance report" });
  }
};

// =======================================================
// ✅ ADMIN SUMMARY
// =======================================================
const getAdminSummary = async (req, res) => {
  try {
    let totalDealers = await Dealer.count();
    let blockedDealers = await Dealer.count({ where: { state: "BLOCKED" } });
    let totalInvoices = await Invoice.count();

    const outstandingInvoices = await Invoice.findAll({
      attributes: ["balanceAmount"],
      where: { balanceAmount: { [Op.gt]: 0 } },
    });

    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.balanceAmount || 0),
      0
    );

    // ✅ Pending documents (flexible enum)
    const pendingStatuses = ["pending"];
    let pendingDocuments = await Document.count({
      where: { status: { [Op.in]: pendingStatuses } },
    });

    // ✅ Pending Pricing Updates
    let pendingPricing = await PricingUpdate.count({
      where: { status: "pending" },
    });

    res.json({
      totalDealers,
      blockedDealers,
      totalInvoices,
      totalOutstanding,
      pendingDocuments,
      pendingPricing,
      activeCampaigns: 0, // Placeholder
    });
  } catch (err) {
    console.error("Admin summary error:", err);
    res.status(500).json({ error: "Failed to generate admin summary" });
  }
};

// =======================================================
// ✅ ACCOUNT STATEMENT REPORT
// =======================================================
const getAccountStatementReport = async (req, res) => {
  try {
    // Month-end Closing Logic (Bypass for super_admin)
    if (isReportLocked() && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: "Report is temporarily unavailable due to month-end closing (last 3 days of the month)."
      });
    }

    const { dealerId, startDate, endDate, productGroup } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (productGroup) where.productGroup = productGroup;

    if (startDate && endDate) {
      where.statementDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      where.dealerId = req.user.dealerId;
    }

    const statements = await AccountStatement.findAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      order: [["statementDate", "ASC"]],
    });

    const openingBalance = statements[0]?.balance || 0;
    const closingBalance = statements.at(-1)?.balance || 0;

    const totalDebit = statements.reduce((sum, s) => sum + Number(s.debitAmount || 0), 0);
    const totalCredit = statements.reduce((sum, s) => sum + Number(s.creditAmount || 0), 0);

    res.json({
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      statements,
    });
  } catch (error) {
    console.error("Account statement error:", error);
    res.status(500).json({ error: "Failed to generate account statement report" });
  }
};

// =======================================================
// ✅ INVOICE REGISTER REPORT
// =======================================================
const getInvoiceRegisterReport = async (req, res) => {
  try {
    // Month-end Closing Logic (Bypass for super_admin)
    if (isReportLocked() && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: "Report is temporarily unavailable due to month-end closing (last 3 days of the month)."
      });
    }

    const { dealerId, productGroup, invoiceNumber, startDate, endDate, status } =
      req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (productGroup) where.productGroup = productGroup;
    if (invoiceNumber) where.invoiceNumber = { [Op.like]: `%${invoiceNumber}%` };
    if (status) where.status = status;

    if (startDate && endDate) {
      where.invoiceDate = { [Op.between]: [startDate, endDate] };
    }

    if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      where.dealerId = req.user.dealerId;
    }

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      order: [["invoiceDate", "DESC"]],
    });

    res.json({ invoices });
  } catch (error) {
    console.error("Invoice register error:", error);
    res.status(500).json({ error: "Failed to generate invoice register report" });
  }
};

// =======================================================
// ✅ CREDIT/DEBIT NOTE REPORT
// =======================================================
const getCreditDebitNoteReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate, reasonCode } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (reasonCode) where.reasonCode = reasonCode;

    if (startDate && endDate) {
      where.noteDate = { [Op.between]: [startDate, endDate] };
    }

    if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      where.dealerId = req.user.dealerId;
    }

    const notes = await CreditDebitNote.findAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      order: [["noteDate", "DESC"]],
    });

    const totalCredit = notes
      .filter((n) => n.noteType === "credit")
      .reduce((sum, n) => sum + Number(n.amount), 0);

    const totalDebit = notes
      .filter((n) => n.noteType === "debit")
      .reduce((sum, n) => sum + Number(n.amount), 0);

    res.json({ notes, totalCredit, totalDebit });
  } catch (error) {
    console.error("Credit/Debit Note error:", error);
    res.status(500).json({ error: "Failed to generate credit/debit note report" });
  }
};

// =======================================================
// ✅ OUTSTANDING RECEIVABLES REPORT
// =======================================================
const getOutstandingReceivablesReport = async (req, res) => {
  try {
    const where = { status: { [Op.ne]: "paid" } };

    if (req.user.role === "dealer") {
      where.dealerId = req.user.dealerId;
    }

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      order: [["dueDate", "ASC"]],
    });

    const today = new Date();

    const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

    invoices.forEach((inv) => {
      const due = new Date(inv.dueDate);
      const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      const amt = Number(inv.balanceAmount || 0);

      if (diff <= 30) aging["0-30"] += amt;
      else if (diff <= 60) aging["31-60"] += amt;
      else if (diff <= 90) aging["61-90"] += amt;
      else aging["90+"] += amt;
    });

    res.json({
      invoices,
      aging,
      totalOutstanding: invoices.reduce(
        (sum, inv) => sum + Number(inv.balanceAmount || 0),
        0
      ),
    });
  } catch (error) {
    console.error("Outstanding receivables error:", error);
    res.status(500).json({ error: "Failed to generate outstanding receivables report" });
  }
};

// =======================================================
// ✅ PENDING APPROVALS
// =======================================================
const getPendingApprovals = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;
    const { getPipeline } = require("../services/workflow/pipelines");

    const workflowCondition = {
      approvalStage: role,
      approvalStatus: "pending",
    };

    // Generic scoping for entities belonging to dealers (Order, Invoice, Payment, etc)
    const dealerScope = await RBACEngine.buildScopeWhereClause(req.user, "Order");
    // Specific scoping for Dealer model itself
    const dealerModelScope = await RBACEngine.buildScopeWhereClause(req.user, "Dealer");

    const tasks = [];

    // 1. Orders
    if (getPipeline('order').includes(role)) {
      const orders = await Order.findAll({
        where: { ...dealerScope, ...workflowCondition },
        include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
      });
      tasks.push(...orders.map(o => ({ id: o.id, type: 'order', title: `Order ${o.orderNumber}`, dealerName: o.dealer?.businessName, createdAt: o.createdAt })));
    }

    // 2. Invoices
    if (getPipeline('invoice').includes(role)) {
      const invoices = await Invoice.findAll({
        where: { ...dealerScope, ...workflowCondition },
        include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
      });
      tasks.push(...invoices.map(i => ({ id: i.id, type: 'invoice', title: `Invoice ${i.invoiceNumber}`, dealerName: i.dealer?.businessName, createdAt: i.createdAt })));
    }

    // 3. Payments
    if (getPipeline('payment').includes(role)) {
      const payments = await PaymentRequest.findAll({
        where: { ...dealerScope, ...workflowCondition },
        include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
      });
      tasks.push(...payments.map(p => ({ id: p.id, type: 'payment', title: `Payment Request (${p.amount})`, dealerName: p.dealer?.businessName, createdAt: p.createdAt })));
    }

    // 4. Pricing
    if (getPipeline('pricing').includes(role)) {
      const pricing = await PricingUpdate.findAll({
        where: { ...dealerScope, ...workflowCondition },
        include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
      });
      tasks.push(...pricing.map(p => ({ id: p.id, type: 'pricing', title: `Price Change Request`, dealerName: p.dealer?.businessName, createdAt: p.createdAt })));
    }

    // 5. Documents
    if (getPipeline('document').includes(role)) {
      const docs = await Document.findAll({
        where: { ...dealerScope, ...workflowCondition },
        include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
      });
      tasks.push(...docs.map(d => ({ id: d.id, type: 'document', title: `${d.documentType} Upload`, dealerName: d.dealer?.businessName, createdAt: d.createdAt })));
    }

    // 6. Campaigns
    if (getPipeline('campaign').includes(role)) {
      const campaigns = await Campaign.findAll({
        where: workflowCondition,
      });
      tasks.push(...campaigns.map(c => ({ id: c.id, type: 'campaign', title: `Campaign: ${c.campaignName}`, dealerName: 'Global/Regional', createdAt: c.createdAt })));
    }

    // 7. Dealers (Onboarding)
    if (getPipeline('dealer').includes(role)) {
      const dealers = await Dealer.findAll({
        where: { ...dealerModelScope, ...workflowCondition },
      });
      tasks.push(...dealers.map(d => ({ id: d.id, type: 'dealer', title: `Dealer Onboarding: ${d.businessName}`, dealerName: d.businessName, createdAt: d.createdAt })));
    }

    res.json(tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    console.error("Pending approvals error:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals", details: err.message });
  }
};
// =======================================================
// ✅ TERRITORY REPORT
// =======================================================
// =======================================================
// ✅ TERRITORY REPORT (MATCHES FRONTEND FORMAT)
// =======================================================
const getTerritoryReport = async (req, res) => {
  try {
    const { state, territory, region } = req.query;

    // Build base where clause
    const where = {};
    if (state) where.state = state;
    if (territory) where.territory = territory;
    if (region) where.region = region;

    // Apply RBAC scoping
    const dealerWhere = await buildDealerWhere(req);
    Object.assign(where, dealerWhere);

    const dealers = await Dealer.findAll({
      where,
      include: [{ model: Invoice, as: "invoices" }],
    });

    let totalSales = 0;
    let territorySalesMap = {};
    let productGroupMap = {};
    let dealerSales = [];

    dealers.forEach((d) => {
      const sales = d.invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount || 0),
        0
      );

      totalSales += sales;

      dealerSales.push({
        dealerName: d.businessName,
        dealerCode: d.dealerCode,
        territory: d.territory,
        totalSales: sales,
      });

      // Territory contribution
      if (!territorySalesMap[d.territory]) territorySalesMap[d.territory] = 0;
      territorySalesMap[d.territory] += sales;

      // Product mix
      d.invoices.forEach((inv) => {
        const grp = inv.productGroup || "OTHERS";
        if (!productGroupMap[grp]) productGroupMap[grp] = 0;
        productGroupMap[grp] += Number(inv.totalAmount || 0);
      });
    });

    const topDealer = dealerSales.sort((a, b) => b.totalSales - a.totalSales)[0] || null;
    const bottomDealer = dealerSales.sort((a, b) => a.totalSales - b.totalSales)[0] || null;

    const territoryContributionChart = Object.entries(territorySalesMap).map(
      ([name, value]) => ({ name, value })
    );

    const productMixChart = Object.entries(productGroupMap).map(
      ([name, value]) => ({ name, value })
    );

    res.json({
      kpis: {
        totalDealers: dealers.length,
        totalSales,
        topTerritory: territoryContributionChart[0]?.name || "-",
        topProductGroup: productMixChart[0]?.name || "-",
      },
      dealerSalesChart: dealerSales,
      territoryContributionChart,
      productMixChart,
      table: dealerSales,
      highlights: {
        topDealer,
        bottomDealer,
      },
    });

  } catch (error) {
    console.error("Territory report error:", error);
    res.status(500).json({ error: "Failed to generate territory report" });
  }
};

// =======================================================
// ✅ REGIONAL SALES SUMMARY REPORT (AS PER PPT)
// =======================================================
const getRegionalSalesSummary = async (req, res) => {
  try {
    const { region, state, territory } = req.query;

    // Build base where clause
    const where = {};
    if (region) where.region = region;
    if (state) where.state = state;
    if (territory) where.territory = territory;

    // Apply RBAC scoping
    const dealerWhere = await buildDealerWhere(req);
    Object.assign(where, dealerWhere);

    // 1️⃣ Fetch Dealers + Their Invoices
    const dealers = await Dealer.findAll({
      where,
      include: [{ model: Invoice, as: "invoices" }]
    });

    // 2️⃣ Grouping → Region → Territory → Dealers
    const result = {};

    dealers.forEach((dealer) => {
      const regionName = dealer.region || "UNASSIGNED";
      const territoryName = dealer.territory || "UNASSIGNED";

      if (!result[regionName]) {
        result[regionName] = {
          region: regionName,
          totalSales: 0,
          totalOutstanding: 0,
          territories: {}
        };
      }

      if (!result[regionName].territories[territoryName]) {
        result[regionName].territories[territoryName] = {
          territory: territoryName,
          totalSales: 0,
          totalOutstanding: 0,
          dealers: []
        };
      }

      const totalSales = dealer.invoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount || 0),
        0
      );

      const outstanding = dealer.invoices.reduce(
        (sum, inv) => sum + Number(inv.balanceAmount || 0),
        0
      );

      // Push Dealer Row
      result[regionName].territories[territoryName].dealers.push({
        dealerCode: dealer.dealerCode,
        dealerName: dealer.businessName,
        totalSales,
        outstanding
      });

      // Update totals
      result[regionName].territories[territoryName].totalSales += totalSales;
      result[regionName].territories[territoryName].totalOutstanding += outstanding;

      result[regionName].totalSales += totalSales;
      result[regionName].totalOutstanding += outstanding;
    });

    res.json({
      generatedAt: new Date(),
      regions: result
    });

  } catch (error) {
    console.error("Regional sales summary error:", error);
    res.status(500).json({ error: "Failed to generate regional sales summary" });
  }
};

// =======================================================
// ✅ NEW FINANCE REPORTS
// =======================================================

const getFIDaywiseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // Combine Invoices and Payments for a daywise view
    const invoices = await Invoice.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      raw: true
    });

    const payments = await PaymentRequest.findAll({
      where: { ...where, status: 'approved' },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalCollection'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      raw: true
    });

    res.json({ invoices, payments });
  } catch (error) {
    console.error("FI Daywise error:", error);
    res.status(500).json({ error: "Failed to generate FI Daywise report" });
  }
};

const getCollectionReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate } = req.query;
    const where = { status: 'approved' };
    if (dealerId) where.dealerId = dealerId;
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const collections = await PaymentRequest.findAll({
      where,
      include: [{ model: Dealer, as: "dealer", attributes: ["businessName", "dealerCode"] }],
      order: [["createdAt", "DESC"]]
    });

    res.json({ collections });
  } catch (error) {
    console.error("Collection report error:", error);
    res.status(500).json({ error: "Failed to generate collection report" });
  }
};

// =======================================================
// ✅ INVENTORY & STOCK REPORTS
// =======================================================

const getStockOverview = async (req, res) => {
  try {
    const inventory = await Inventory.findAll({
      include: [{ model: Material, as: "material" }]
    });
    res.json({ inventory });
  } catch (error) {
    console.error("Stock overview error:", error);
    res.status(500).json({ error: "Failed to load stock overview" });
  }
};

const getComparativeStockReport = async (req, res) => {
  try {
    // Compare Current Stock with Reorder Level
    const materials = await Material.findAll();
    const inventory = await Inventory.findAll();

    const report = materials.map(m => {
      const inv = inventory.find(i => i.materialNumber === m.materialNumber) || { stock: 0 };
      return {
        materialNumber: m.materialNumber,
        name: m.name,
        plantStock: m.stock, // Stock at central plant
        depotStock: inv.stock, // Stock at dealer/depot
        reorderLevel: m.reorderLevel,
        status: inv.stock < m.reorderLevel ? 'LOW' : 'OPTIMAL'
      };
    });

    res.json(report);
  } catch (error) {
    console.error("Comparative stock error:", error);
    res.status(500).json({ error: "Failed to generate comparative stock report" });
  }
};

const getComplianceReport = async (req, res) => {
  try {
    // Tracks nearing expiry or low compliance materials
    const materials = await Material.findAll({
      where: {
        expiryDate: { [Op.lt]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // Expiry in 30 days
      }
    });
    res.json({ expringSoon: materials });
  } catch (error) {
    console.error("Compliance report error:", error);
    res.status(500).json({ error: "Failed to generate compliance report" });
  }
};

const getRRSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.rrDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const receipts = await RailwayReceipt.findAll({
      where,
      include: [{ model: RakeArrival, as: "rake" }],
      order: [['rrDate', 'DESC']]
    });
    res.json({ receipts });
  } catch (error) {
    console.error("RR Summary error:", error);
    res.status(500).json({ error: "Failed to generate RR summary report" });
  }
};

// =======================================================
// ✅ RAKE & DAMAGE REPORTS
// =======================================================

const getRakeArrivalReport = async (req, res) => {
  try {
    const { regionId, startDate, endDate } = req.query;
    const where = {};

    if (regionId) where.regionId = regionId;
    if (startDate && endDate) {
      where.arrivalDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const rakes = await RakeArrival.findAll({
      where,
      order: [['arrivalDate', 'DESC']]
    });
    res.json({ rakes });
  } catch (error) {
    console.error("Rake arrival report error:", error);
    res.status(500).json({ error: "Failed to generate rake arrival report" });
  }
};

const getRakeDetail = async (req, res) => {
  try {
    const rake = await RakeArrival.findByPk(req.params.id, {
      include: [{ model: RailwayReceipt, as: "railwayReceipts" }]
    });
    if (!rake) return res.status(404).json({ error: "Rake not found" });
    res.json(rake);
  } catch (error) {
    console.error("Rake detail error:", error);
    res.status(500).json({ error: "Failed to fetch rake details" });
  }
};

const getConsolidatedExceptionReport = async (req, res) => {
  try {
    const { regionId, startDate, endDate } = req.query;
    const where = {
      [Op.or]: [
        { damagedQuantity: { [Op.gt]: 0 } },
        { exceptions: { [Op.ne]: null } }
      ]
    };

    if (regionId) where.regionId = regionId;
    if (startDate && endDate) {
      where.arrivalDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const rakes = await RakeArrival.findAll({
      where
    });
    res.json({ exceptions: rakes });
  } catch (error) {
    console.error("Exception report error:", error);
    res.status(500).json({ error: "Failed to generate exception report" });
  }
};

const getRakeApprovals = async (req, res) => {
  try {
    const rakes = await RakeArrival.findAll({
      where: { approvalStatus: 'pending' }
    });
    res.json({ pendingApprovals: rakes });
  } catch (error) {
    console.error("Rake approvals error:", error);
    res.status(500).json({ error: "Failed to fetch rake approvals" });
  }
};

// =======================================================
// ✅ TECHNICAL / DATA MANAGEMENT
// =======================================================

const getDiversionReport = async (req, res) => {
  try {
    const { startDate, endDate, dealerId } = req.query;
    const where = {
      [Op.or]: [
        { status: 'Diverted' },
        { notes: { [Op.iLike]: '%diversion%' } }
      ]
    };

    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    if (dealerId) where.dealerId = dealerId;

    const diversions = await Order.findAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ diversions });
  } catch (error) {
    console.error("Diversion report error:", error);
    res.status(500).json({ error: "Failed to generate diversion report" });
  }
};

const getDMSOrderRequestReport = async (req, res) => {
  try {
    // Tracks orders coming specifically from DMS integration
    const orders = await Order.findAll({
      where: {
        orderNumber: { [Op.iLike]: 'DMS-%' }
      },
      include: [{ model: Dealer, as: "dealer" }]
    });
    res.json({ dmsOrders: orders });
  } catch (error) {
    console.error("DMS order report error:", error);
    res.status(500).json({ error: "Failed to generate DMS order report" });
  }
};

// =======================================================
// ✅ EXPORT
// =======================================================
module.exports = {
  getDealerPerformanceReport,
  getAdminSummary,
  getAccountStatementReport,
  getInvoiceRegisterReport,
  getCreditDebitNoteReport,
  getOutstandingReceivablesReport,
  getTerritoryReport,
  getPendingApprovals,
  getRegionalSalesSummary,
  getSuperDashboard,
  getRegionalDashboard,
  getManagerDashboard,
  getDealerDashboard,
  // New Reports
  getFIDaywiseReport,
  getCollectionReport,
  getStockOverview,
  getComparativeStockReport,
  getComplianceReport,
  getRRSummaryReport,
  getRakeArrivalReport,
  getRakeDetail,
  getConsolidatedExceptionReport,
  getRakeApprovals,
  getDiversionReport,
  getDMSOrderRequestReport
,

  // New Exports
  exportReportPDF,
  exportReportExcel
};

// =======================================================
// ✅ EXPORT CONTROLLERS
// =======================================================

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const exportReportPDF = async (req, res) => {
  try {
    const { title, columns, data } = req.body;

    if (!data || !Array.isArray(data) || !columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: "Invalid data format. Expected { title, columns: [], data: [] }" });
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.pdf"`);

    doc.pipe(res);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text(title || 'Report Export', { align: 'center' });
    doc.moveDown();
    
    // Timestamp
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Table settings
    const startX = 30;
    let currentY = doc.y;
    const pageWidth = doc.page.width - 60;
    const colWidth = pageWidth / columns.length;

    // Header Helper
    const printHeader = () => {
      doc.fontSize(9).font('Helvetica-Bold');
      columns.forEach((col, i) => {
        doc.text(col.header, startX + (i * colWidth), currentY, { width: colWidth - 5, align: 'left', ellipsis: true });
      });
      
      currentY += 12;
      doc.moveTo(startX, currentY).lineTo(startX + pageWidth, currentY).stroke();
      currentY += 8;
    };

    printHeader();

    // Rows
    doc.fontSize(9).font('Helvetica');
    
    for (const row of data) {
      // Check page break
      if (currentY > doc.page.height - 50) {
        doc.addPage();
        currentY = 30;
        printHeader();
        doc.font('Helvetica'); // Reset font for body
      }

      // Print cells
      const rowY = currentY;
      let maxCellHeight = 0;

      columns.forEach((col, i) => {
        const val = row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '-';
        
        // Calculate height
        const height = doc.heightOfString(val, { width: colWidth - 5 });
        if (height > maxCellHeight) maxCellHeight = height;

        doc.text(val, startX + (i * colWidth), rowY, { width: colWidth - 5, align: 'left' });
      });

      currentY += maxCellHeight + 8; // Add passing
      
      // Light separator line
      doc.save();
      doc.opacity(0.1);
      doc.moveTo(startX, currentY - 4).lineTo(startX + pageWidth, currentY - 4).stroke();
      doc.restore();
    }

    doc.end();

  } catch (error) {
    console.error("Export PDF Error:", error);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
};

const exportReportExcel = async (req, res) => {
  try {
    const { title, columns, data } = req.body;

    if (!data || !columns) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Report');

    // Headers
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: 20
    }));

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Data
    worksheet.addRows(data);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Export Excel Error:", error);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate Excel" });
  }
};
