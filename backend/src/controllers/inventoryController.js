// src/controllers/inventoryController.js
const { Inventory, AuditLog } = require("../models");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// 🧮 Summary for dashboard
// src/controllers/inventoryController.js
exports.getInventorySummary = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;

    const items = await Inventory.findAll({ order: [["name", "ASC"]] });

    // filter view by role (dealers see limited fields)
    let visibleInventory;
    if (["dealer_admin", "dealer_staff", "dealer"].includes(role)) {
      visibleInventory = items.map((i) => ({
        id: i.id,
        product: i.name,
        available: i.stock,
      }));
    } else if (["territory_manager", "area_manager", "regional_manager", "regional_admin"].includes(role)) {
      visibleInventory = items.map((i) => ({
        id: i.id,
        product: i.name,
        available: i.stock,
        plant: i.plant,
      }));
    } else {
      visibleInventory = items;
    }

    const lowStock = items.filter((i) => i.stock <=  (i.reorderLevel || 0)).length;

    res.json({
      role,
      inventory: visibleInventory,
      summary: { totalSkus: items.length, lowStock },
    });
  } catch (error) {
    console.error("getInventorySummary:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
};

// 📋 Get detailed inventory list
exports.getInventoryDetails = async (req, res) => {
  try {
    const items = await Inventory.findAll({ order: [["updatedAt", "DESC"]] });
    res.json(items);
  } catch (error) {
    console.error("getInventoryDetails:", error);
    res.status(500).json({ error: "Failed to fetch detailed inventory" });
  }
};

// ➕ Add new inventory item
exports.addItem = async (req, res) => {
  try {
    const { product, available, plant, reorderLevel, uom, sapMaterialNumber } = req.body;
    const newItem = await Inventory.create({
      name: product,
      stock: parseInt(available ?? 0, 10),
      plant,
      reorderLevel: parseInt(reorderLevel ?? 0, 10),
      uom,
      sapMaterialNumber,
    });

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
    console.error("addItem:", err);
    res.status(500).json({ error: "Failed to add item" });
  }
};

// ✏️ Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findByPk(id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const payload = {};
    if (req.body.product !== undefined) payload.name = req.body.product;
    if (req.body.available !== undefined) payload.stock = parseInt(req.body.available, 10);
    if (req.body.plant !== undefined) payload.plant = req.body.plant;
    if (req.body.reorderLevel !== undefined) payload.reorderLevel = parseInt(req.body.reorderLevel, 10);
    if (req.body.uom !== undefined) payload.uom = req.body.uom;
    if (req.body.sapMaterialNumber !== undefined) payload.sapMaterialNumber = req.body.sapMaterialNumber;

    await item.update(payload);

    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE_INVENTORY_ITEM",
      entity: "Inventory",
      entityId: id,
      changes: payload,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Item updated", item });
  } catch (err) {
    console.error("updateItem:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
};

// ❌ Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findByPk(id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const deleted = item.toJSON();
    await item.destroy();

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
    console.error("deleteItem:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
};

// 📤 Export inventory (Excel / PDF)
exports.exportInventory = async (req, res) => {
  try {
    const format = req.query.format || "excel";
    const rows = await Inventory.findAll({ order: [["name", "ASC"]] });

    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=inventory.pdf");
      doc.text("Inventory Report", { align: "center" }).moveDown();
      rows.forEach((i) =>
        doc.text(`${i.name} - ${i.stock} ${i.uom || ""} (${i.plant})`)
      );
      doc.pipe(res);
      doc.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Inventory");
      sheet.columns = [
        { header: "Product", key: "product", width: 20 },
        { header: "Available", key: "available", width: 15 },
        { header: "UOM", key: "uom", width: 10 },
        { header: "Plant", key: "plant", width: 20 },
        { header: "Reorder Level", key: "reorderLevel", width: 20 },
        { header: "SAP Material", key: "sapMaterialNumber", width: 20 },
      ];
      sheet.addRows(
        rows.map((i) => ({
          product: i.name,
          available: i.stock,
          uom: i.uom,
          plant: i.plant,
          reorderLevel: i.reorderLevel,
          sapMaterialNumber: i.sapMaterialNumber,
        }))
      );
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


