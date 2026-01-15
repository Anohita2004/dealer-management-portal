const {
    Dealer,
    Material,
    Inventory,
    RakeArrival,
    RailwayReceipt,
    Order,
    PaymentRequest,
    sequelize,
} = require("../src/models");

const seedReportData = async () => {
    try {
        console.log("Starting report data seeding...");

        // 1. Get a dealer
        const dealer = await Dealer.findOne({ where: { dealerCode: 'D001' } });
        if (!dealer) {
            console.error("Dealer D001 not found. Please run main seed first.");
            return;
        }

        // 2. Seed Materials
        const materials = await Material.bulkCreate([
            {
                materialNumber: "MAT001",
                name: "Ultra Cement 50KG",
                description: "Premium Portland Cement",
                uom: "BAG",
                plant: "Mumbai",
                stock: 5000,
                reorderLevel: 1000,
                expiryDate: new Date("2026-12-31"),
            },
            {
                materialNumber: "MAT002",
                name: "Steel Rod 12mm",
                description: "TMT Reinforcement Steel",
                uom: "TON",
                plant: "Raipur",
                stock: 200,
                reorderLevel: 50,
                expiryDate: null,
            },
            {
                materialNumber: "MAT003",
                name: "Wall Paint White 20L",
                description: "Exterior Emulsion White",
                uom: "CAN",
                plant: "Gurgaon",
                stock: 800,
                reorderLevel: 200,
                expiryDate: new Date("2026-06-30"),
            },
            {
                materialNumber: "MAT004",
                name: "Adhesive 10KG",
                description: "Strong Bonding Adhesive",
                uom: "KG",
                plant: "Mumbai",
                stock: 1500,
                reorderLevel: 300,
                expiryDate: new Date("2025-05-15"), // Nearing expiry for compliance report
            },
        ], { ignoreDuplicates: true });

        // 3. Seed Inventory (Depot/Dealer Stock)
        await Inventory.bulkCreate([
            {
                materialNumber: "MAT001",
                name: "Ultra Cement 50KG",
                plant: "D001 Depot",
                stock: 450,
                uom: "BAG",
                reorderLevel: 500, // Status will be LOW
            },
            {
                materialNumber: "MAT002",
                name: "Steel Rod 12mm",
                plant: "D001 Depot",
                stock: 60,
                uom: "TON",
                reorderLevel: 50, // Status will be OPTIMAL
            },
        ], { ignoreDuplicates: true });

        // 4. Seed Rake Arrivals
        const [rake1] = await RakeArrival.findOrCreate({
            where: { rakeNumber: "RAKE-2026-001" },
            defaults: {
                arrivalDate: new Date("2026-01-10"),
                status: "Completed",
                totalQuantity: 2500,
                damagedQuantity: 0,
                approvalStatus: "approved",
            }
        });

        const [rake2] = await RakeArrival.findOrCreate({
            where: { rakeNumber: "RAKE-2026-002" },
            defaults: {
                arrivalDate: new Date("2026-01-14"),
                status: "Arrived",
                totalQuantity: 2500,
                damagedQuantity: 15,
                exceptions: "15 bags damaged due to moisture",
                approvalStatus: "pending",
            }
        });

        // 5. Seed Railway Receipts
        await RailwayReceipt.findOrCreate({
            where: { rrNumber: "RR-998877" },
            defaults: {
                rrDate: new Date("2026-01-08"),
                rakeId: rake1.id,
                quantity: 2500,
                freightAmount: 125000,
            }
        });

        await RailwayReceipt.findOrCreate({
            where: { rrNumber: "RR-998878" },
            defaults: {
                rrDate: new Date("2026-01-12"),
                rakeId: rake2.id,
                quantity: 2500,
                freightAmount: 128000,
            }
        });

        // 6. Seed Orders (DMS and Diversion)
        await Order.findOrCreate({
            where: { orderNumber: "DMS-ORD-701" },
            defaults: {
                dealerId: dealer.id,
                status: "Delivered",
                totalAmount: 45000,
                notes: "Auto-synced from Dealer Management System",
            }
        });

        await Order.findOrCreate({
            where: { orderNumber: "ORD-2026-505" },
            defaults: {
                dealerId: dealer.id,
                status: "Shipped",
                totalAmount: 98000,
                notes: "DIVERSION: Shipment redirected to South Warehouse due to blockage",
            }
        });

        // 7. Seed Payment Requests (for Collection report)
        await PaymentRequest.findOrCreate({
            where: { referenceNumber: "TXN123456" },
            defaults: {
                dealerId: dealer.id,
                amount: 50000,
                paymentMode: "NEFT",
                status: "approved",
                createdAt: new Date("2026-01-14"),
            }
        });

        await PaymentRequest.findOrCreate({
            where: { referenceNumber: "CHQ9988" },
            defaults: {
                dealerId: dealer.id,
                amount: 25000,
                paymentMode: "Cheque",
                status: "pending",
                createdAt: new Date("2026-01-15"),
            }
        });

        console.log("✅ Report data seeding completed!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        await sequelize.close();
    }
};

seedReportData();
