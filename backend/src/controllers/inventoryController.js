// src/controllers/inventoryController.js
const { Inventory, AuditLog } = require("../models");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");

// Helper function to format inventory item for frontend
const formatInventoryItem = (item) => {
  const materialNumber = item.materialNumber || item.sapMaterialNumber || item.materialCode || "";
  const stock = item.stock || 0;
  const minStock = item.minStock || item.reorderLevel || 0;
  
  // Determine status
  let status = "in_stock";
  if (stock === 0) {
    status = "out";
  } else if (stock <= minStock) {
    status = "low";
  }
  
  return {
    id: item.id,
    name: item.name,
    materialName: item.name,
    materialNumber: materialNumber,
    materialCode: materialNumber,
    plant: item.plant,
    warehouse: item.plant, // warehouse is same as plant
    stock: stock,
    availableStock: stock,
    minStock: minStock,
    reorderLevel: item.reorderLevel || item.minStock || 0,
    uom: item.uom || "EA",
    price: parseFloat(item.price || 0),
    description: item.description || "",
    status: status, // "out", "low", or "in_stock"
  };
};

// 🧮 Summary for dashboard
exports.getInventorySummary = async (req, res) => {
  try {
    const items = await Inventory.findAll({ order: [["name", "ASC"]] });

    // Format inventory items for frontend
    const inventory = items.map(formatInventoryItem);

    // Get unique warehouses/plants (they are the same)
    const uniquePlants = [...new Set(items.map((i) => i.plant).filter(Boolean))];
    const warehouses = uniquePlants.map((plant) => ({
      code: plant,
      name: plant,
      plant: plant,
      warehouse: plant, // warehouse is same as plant
    }));

    // Calculate summary statistics
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price || 0) * (item.stock || 0));
    }, 0);
    const lowStockCount = items.filter((i) => {
      const minStock = i.minStock || i.reorderLevel || 0;
      return i.stock > 0 && i.stock <= minStock;
    }).length;
    const outOfStockCount = items.filter((i) => i.stock === 0).length;

    // Get out of stock items
    const outOfStockItems = items
      .filter((i) => i.stock === 0)
      .map(formatInventoryItem);

    res.json({
      inventory,
      warehouses, // List of unique warehouses/plants
      outOfStockItems, // Out of stock items
      summary: {
        totalItems,
        totalValue,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error) {
    console.error("getInventorySummary:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
};

// 📋 Get detailed inventory list with pagination and filtering
exports.getInventoryDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const search = req.query.search || "";
    // Plant and warehouse are the same - accept both
    const plant = req.query.plant || req.query.warehouse || "";
    const stockFilter = req.query.stockFilter || ""; // "low", "out", or empty

    // Build where clause
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sapMaterialNumber: { [Op.like]: `%${search}%` } },
        { materialNumber: { [Op.like]: `%${search}%` } },
        { materialCode: { [Op.like]: `%${search}%` } },
      ];
    }

    // Plant/Warehouse filter (they are the same)
    if (plant) {
      whereClause.plant = plant;
    }

    // Stock filter
    if (stockFilter === "low") {
      // Items with stock <= reorderLevel but > 0
      const items = await Inventory.findAll({ where: whereClause });
      const lowStockItems = items.filter((item) => {
        const minStock = item.minStock || item.reorderLevel || 0;
        return item.stock > 0 && item.stock <= minStock;
      });
      const total = lowStockItems.length;
      const totalPages = Math.ceil(total / pageSize);
      const paginatedItems = lowStockItems.slice((page - 1) * pageSize, page * pageSize);

      return res.json({
        inventory: paginatedItems.map(formatInventoryItem),
        total,
        page,
        pageSize,
        totalPages,
      });
    } else if (stockFilter === "out") {
      whereClause.stock = 0;
    }

    // Get total count
    const total = await Inventory.count({ where: whereClause });
    const totalPages = Math.ceil(total / pageSize);

    // Get paginated items
    const items = await Inventory.findAll({
      where: whereClause,
      order: [["updatedAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      inventory: items.map(formatInventoryItem),
      total,
      page,
      pageSize,
      totalPages,
    });
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

// 🔔 Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const items = await Inventory.findAll({ order: [["name", "ASC"]] });
    
    // Filter items where stock is at or below reorder level
    const lowStockItems = items.filter((item) => {
      const minStock = item.minStock || item.reorderLevel || 0;
      return item.stock <= minStock;
    });

    // Format the response
    const alerts = lowStockItems.map((item) => {
      const minStock = item.minStock || item.reorderLevel || 0;
      const materialNumber = item.materialNumber || item.sapMaterialNumber || item.materialCode || "";
      return {
        ...formatInventoryItem(item),
        status: item.stock === 0 ? "out" : "low",
      };
    });

    // Calculate summary
    const lowStock = alerts.filter((a) => a.status === "low").length;
    const outOfStock = alerts.filter((a) => a.status === "out").length;

    res.json({
      alerts,
      summary: {
        totalAlerts: alerts.length,
        lowStock,
        outOfStock,
      },
    });
  } catch (error) {
    console.error("getLowStockAlerts:", error);
    res.status(500).json({ error: "Failed to fetch low stock alerts" });
  }
};

// 📊 Get inventory for specific plant/warehouse
exports.getPlantInventory = async (req, res) => {
  try {
    // plantCode and warehouseCode are the same - route can use either
    const code = req.params.plantCode || req.params.warehouseCode;
    
    if (!code) {
      return res.status(400).json({ error: "Plant/Warehouse code is required" });
    }

    const items = await Inventory.findAll({
      where: { plant: code },
      order: [["name", "ASC"]],
    });

    // Format inventory items
    const inventory = items.map(formatInventoryItem);

    // Calculate summary
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + (item.stock || 0), 0);
    const lowStock = items.filter((item) => {
      const minStock = item.minStock || item.reorderLevel || 0;
      return item.stock > 0 && item.stock <= minStock;
    }).length;
    const outOfStock = items.filter((item) => item.stock === 0).length;

    res.json({
      inventory,
      plant: code,
      warehouse: code, // warehouse is same as plant
      summary: {
        totalItems,
        totalStock,
        lowStock,
        outOfStock,
      },
    });
  } catch (error) {
    console.error("getPlantInventory:", error);
    res.status(500).json({ error: "Failed to fetch plant inventory" });
  }
};

// 🔧 Adjust stock level
exports.adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined || adjustment === null) {
      return res.status(400).json({ error: "Adjustment value is required" });
    }

    const item = await Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const oldStock = item.stock || 0;
    const newStock = Math.max(0, oldStock + parseInt(adjustment, 10));

    await item.update({ stock: newStock });

    // Create audit log
    await AuditLog.create({
      userId: req.user.id,
      action: "ADJUST_INVENTORY_STOCK",
      entity: "Inventory",
      entityId: id,
      changes: {
        oldStock,
        newStock,
        adjustment: parseInt(adjustment, 10),
        reason: reason || "Stock adjustment",
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      message: "Stock adjusted successfully",
      item: formatInventoryItem(item),
      adjustment: {
        oldStock,
        newStock,
        adjustment: parseInt(adjustment, 10),
        reason: reason || "Stock adjustment",
      },
    });
  } catch (error) {
    console.error("adjustStock:", error);
    res.status(500).json({ error: "Failed to adjust stock" });
  }
};


