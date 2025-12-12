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
  Region,
  Area,
  Territory,
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

  const [invoiceAgg] = await Invoice.findAll({
    where: dealerIds.length ? { dealerId: { [Op.in]: dealerIds } } : {},
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "totalInvoices"],
      [sequelize.fn("SUM", sequelize.col("balanceAmount")), "outstanding"],
    ],
    raw: true,
  });

  const outstanding = Number(invoiceAgg?.outstanding || 0);
  const totalInvoices = Number(invoiceAgg?.totalInvoices || 0);

  const pendingDocs = await Document.count({
    include: dealerIds.length
      ? [{ model: Dealer, as: "dealer", where: { id: { [Op.in]: dealerIds } } }]
      : [{ model: Dealer, as: "dealer" }],
    where: { status: "pending" },
  });

  const pendingPricing = await PricingUpdate.count({
    include: dealerIds.length
      ? [{ model: Dealer, as: "dealer", where: { id: { [Op.in]: dealerIds } } }]
      : [{ model: Dealer, as: "dealer" }],
    where: { status: "pending" },
  });

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
    approvalsPending: pendingDocs + pendingPricing,
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
    const scope = RBACEngine.getUserScope(req.user);
    if (!scope.dealerId) return res.status(400).json({ error: "dealerId missing" });
    const summary = await dashboardSummary({ id: scope.dealerId }, req.user);
    res.json(summary);
  } catch (err) {
    console.error("Dealer dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
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
    const whereDealer = await buildDealerWhere(req);

    const pendingDocs = await Document.findAll({
      where: { status: "pending" },
      include: [
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "businessName"],
          where: Object.keys(whereDealer).length ? whereDealer : undefined,
        },
      ],
    });

    const formatted = pendingDocs.map((doc) => ({
      id: doc.id,
      dealerId: doc.dealer?.id,
      dealerName: doc.dealer?.businessName || "Unknown Dealer",
      documentType: doc.documentType,
      createdAt: doc.createdAt,
      status: doc.status,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Pending approvals error:", err);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
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
};
