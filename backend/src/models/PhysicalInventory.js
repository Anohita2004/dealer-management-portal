module.exports = (sequelize, DataTypes) => {
    const PhysicalInventory = sequelize.define(
        "PhysicalInventory",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            plant: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            storage_location: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
            },
            status: {
                type: DataTypes.ENUM("PLANNED", "IN_PROGRESS", "REVIEW", "POSTED", "CANCELLED"),
                defaultValue: "PLANNED",
            },
            planned_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            posted_date: {
                type: DataTypes.DATE,
            },
            sap_doc_no: {
                type: DataTypes.STRING,
                comment: "SAP Physical Inventory Document Number",
            },
        },
        {
            tableName: "PhysicalInventories",
            timestamps: true,
        }
    );

    PhysicalInventory.associate = (models) => {
        PhysicalInventory.hasMany(models.InventoryCount, { foreignKey: 'physical_inventory_id', as: 'counts' });
    };

    return PhysicalInventory;
};
