const { Dealer, Invoice, Campaign } = require("../models");

exports.getInventorySummary = async (req, res) => {
  try {
    // Simulated inventory summary — later can pull from SAP or DB
    const totalDealers = await Dealer.count();
    const activeCampaigns = await Campaign.count({ where: { isActive: true } });
    const totalInvoices = await Invoice.count();

    const mockInventory = [
      { product: "Laptops", available: 120, plant: "Mumbai" },
      { product: "Desktops", available: 75, plant: "Pune" },
      { product: "Printers", available: 30, plant: "Delhi" },
      { product: "Monitors", available: 200, plant: "Bangalore" },
    ];

    res.json({
      summary: {
        totalDealers,
        totalInvoices,
        activeCampaigns,
      },
      inventory: mockInventory,
    });
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    res.status(500).json({ error: "Failed to fetch inventory data" });
  }
};

exports.getInventoryDetails = async (req, res) => {
  try {
    const mockData = [
      { id: 1, product: "Laptop", stock: 100, location: "Mumbai", updatedAt: "2025-11-01" },
      { id: 2, product: "Printer", stock: 50, location: "Pune", updatedAt: "2025-11-02" },
    ];
    res.json(mockData);
  } catch (error) {
    console.error("Error fetching inventory details:", error);
    res.status(500).json({ error: "Failed to fetch detailed inventory" });
  }
};

