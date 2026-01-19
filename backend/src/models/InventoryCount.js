module.exports = (sequelize, DataTypes) => {
    const InventoryCount = sequelize.define(
        "InventoryCount",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            physical_inventory_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "PhysicalInventories", key: "id" },
            },
            material_code: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            material_desc: {
                type: DataTypes.STRING,
            },
            batch: {
                type: DataTypes.STRING,
            },
            book_qty: {
                type: DataTypes.DECIMAL(10, 2),
                defaultValue: 0,
                comment: "System Stock at time of initiation",
            },
            physical_qty: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                comment: "Counted Quantity",
            },
            variance: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
            },
            uom: {
                type: DataTypes.STRING,
                defaultValue: 'EA',
            },
            status: {
                type: DataTypes.ENUM("PENDING", "COUNTED", "VERIFIED"),
                defaultValue: "PENDING",
            },
        },
        {
            tableName: "InventoryCounts",
            timestamps: true,
        }
    );

    InventoryCount.associate = (models) => {
        InventoryCount.belongsTo(models.PhysicalInventory, { foreignKey: 'physical_inventory_id', as: 'header' });
    };

    return InventoryCount;
};
