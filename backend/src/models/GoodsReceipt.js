
// Expanded GoodsReceipt model for SAP/warehouse integration
module.exports = (sequelize, DataTypes) => {
    const GoodsReceipt = sequelize.define('GoodsReceipt', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        receiptNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Local receipt number or SAP MBLNR',
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Order reference (if local order)',
        },
        dealerId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Dealer reference (if local dealer)',
        },
        poNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Purchase Order number (EBELN) from SAP',
        },
        poItem: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'PO Item (EBELP) from SAP',
        },
        supplierId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Supplier code (KUNNR) from SAP',
        },
        materialCode: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Material code (MATNR) from SAP',
        },
        quantity: {
            type: DataTypes.FLOAT,
            allowNull: true,
            comment: 'Quantity received (MENGE)',
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Unit of measure (MEINS)',
        },
        netPrice: {
            type: DataTypes.FLOAT,
            allowNull: true,
            comment: 'Net price (NETPR)',
        },
        plant: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Plant code (WERKS)',
        },
        storageLocation: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Storage location (SLOC)',
        },
        batch: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Batch number (if applicable)',
        },
        costCenterId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Cost center code (KOSTL)',
        },
        grDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Goods receipt date',
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            comment: 'Status: pending, accepted, rejected, posted, error',
        },
        mblnr: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Material document number (MBLNR) after posting',
        },
        receivedItems: {
            type: DataTypes.JSON, // Stores array of { materialId, quantity, barcode }
            allowNull: true,
            comment: 'Array of received items (for multi-material receipts)',
        },
        receivedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: true,
            comment: 'Date/time of receipt',
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'goods_receipts',
        timestamps: true,
    });

    GoodsReceipt.associate = (models) => {
        GoodsReceipt.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
        GoodsReceipt.belongsTo(models.Dealer, { foreignKey: 'dealerId', as: 'dealer' });
        // Add future associations for supplier, cost center, etc.
    };

    return GoodsReceipt;
};

/*
// MySQL: Use the same Sequelize model, just change the connection config.

// MongoDB (Mongoose) template for future use:
// const mongoose = require('mongoose');
// const GoodsReceiptSchema = new mongoose.Schema({
//   receiptNumber: String,
//   orderId: String,
//   dealerId: String,
//   poNumber: String,
//   poItem: String,
//   supplierId: String,
//   materialCode: String,
//   quantity: Number,
//   unit: String,
//   netPrice: Number,
//   plant: String,
//   storageLocation: String,
//   batch: String,
//   costCenterId: String,
//   grDate: Date,
//   status: { type: String, default: 'pending' },
//   mblnr: String,
//   receivedItems: Array,
//   receivedAt: Date,
//   remarks: String,
// }, { timestamps: true });
// module.exports = mongoose.model('GoodsReceipt', GoodsReceiptSchema);
*/
