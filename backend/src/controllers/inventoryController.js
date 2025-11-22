// src/controllers/inventoryController.js
const { Dealer, Invoice, Campaign, AuditLog } = require("../models");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// 🧾 Mock data (replace later with DB or SAP)
let inventoryList = [
  { id: 1, product: "Laptop", available: 100, plant: "Mumbai", reorderLevel: 20, updatedAt: "2025-11-01" },
  { id: 2, product: "Printer", available: 5, plant: "Pune", reorderLevel: 10, updatedAt: "2025-11-02" },
  { id: 3, product: "Monitor", available: 50, plant: "Delhi", reorderLevel: 15, updatedAt: "2025-11-03" },
];

// 🧮 Summary for dashboard
// src/controllers/inventoryController.js
exports.getInventorySummary = async (req, res) => {
  try {
    const role = req.user.role;

    // base mock data
    const baseInventory = [
      { id: 1, product: "Laptop", available: 100, plant: "Mumbai", reorderLevel: 20, updatedAt: "2025-11-01" },
      { id: 2, product: "Printer", available: 5, plant: "Pune", reorderLevel: 10, updatedAt: "2025-11-02" },
      { id: 3, product: "Monitor", available: 50, plant: "Delhi", reorderLevel: 15, updatedAt: "2025-11-03" },
    ];

    // filter by role
    let visibleInventory;
    if (role === "dealer") {
      visibleInventory = baseInventory.map((i) => ({
        product: i.product,
        available: i.available,
      }));
    } else if (role === "manager") {
      visibleInventory = baseInventory.map((i) => ({
        product: i.product,
        available: i.available,
        plant: i.plant,
      }));
    } else {
      visibleInventory = baseInventory; // admin or inventory user
    }

    res.json({
      role,
      inventory: visibleInventory,
      summary: { totalDealers: 50, totalInvoices: 120, activeCampaigns: 8 },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
};

// 📋 Get detailed inventory list
exports.getInventoryDetails = async (req, res) => {
  try {
    res.json(inventoryList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch detailed inventory" });
  }
};

// ➕ Add new inventory item
exports.addItem = async (req, res) => {
  try {
    const { product, available, plant, reorderLevel } = req.body;
    const newItem = {
      id: inventoryList.length + 1,
      product,
      available: parseInt(available),
      plant,
      reorderLevel: parseInt(reorderLevel || 10),
      updatedAt: new Date().toISOString(),
    };
    inventoryList.push(newItem);

    await AuditLog.create({
      userId: req.user.id,
      action: "ADD_INVENTORY_ITEM",
      entity: "Inventory",
      entityId: newItem.id,
      changes: newItem,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ message: "Item added successfully", item: newItem });
  } catch (err) {
    res.status(500).json({ error: "Failed to add item" });
  }
};

// ✏️ Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const index = inventoryList.findIndex((i) => i.id == id);
    if (index === -1) return res.status(404).json({ error: "Item not found" });

    const updated = { ...inventoryList[index], ...req.body, updatedAt: new Date().toISOString() };
    inventoryList[index] = updated;

    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE_INVENTORY_ITEM",
      entity: "Inventory",
      entityId: id,
      changes: updated,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Item updated", item: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
};

// ❌ Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const index = inventoryList.findIndex((i) => i.id == id);
    if (index === -1) return res.status(404).json({ error: "Item not found" });

    const deleted = inventoryList[index];
    inventoryList.splice(index, 1);

    await AuditLog.create({
      userId: req.user.id,
      action: "DELETE_INVENTORY_ITEM",
      entity: "Inventory",
      entityId: id,
      changes: deleted,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: `Item ${id} deleted`, deleted });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};

// 📤 Export inventory (Excel / PDF)
exports.exportInventory = async (req, res) => {
  try {
    const format = req.query.format || "excel";

    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=inventory.pdf");
      doc.text("Inventory Report", { align: "center" }).moveDown();
      inventoryList.forEach((i) =>
        doc.text(`${i.product} - ${i.available} units (${i.plant})`)
      );
      doc.pipe(res);
      doc.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Inventory");
      sheet.columns = [
        { header: "Product", key: "product", width: 20 },
        { header: "Available", key: "available", width: 15 },
        { header: "Plant", key: "plant", width: 20 },
        { header: "Reorder Level", key: "reorderLevel", width: 20 },
      ];
      sheet.addRows(inventoryList);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=inventory.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export inventory" });
  }
};


