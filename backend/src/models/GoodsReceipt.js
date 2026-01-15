module.exports = (sequelize, DataTypes) => {
    const GoodsReceipt = sequelize.define('GoodsReceipt', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        receiptNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        dealerId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        receivedItems: {
            type: DataTypes.JSON, // Stores array of { materialId, quantity, barcode }
            allowNull: false
        },
        receivedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        remarks: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'goods_receipts',
        timestamps: true
    });

    GoodsReceipt.associate = (models) => {
        GoodsReceipt.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
        GoodsReceipt.belongsTo(models.Dealer, { foreignKey: 'dealerId', as: 'dealer' });
    };

    return GoodsReceipt;
};
