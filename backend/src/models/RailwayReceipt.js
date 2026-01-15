module.exports = (sequelize, DataTypes) => {
    const RailwayReceipt = sequelize.define(
        "RailwayReceipt",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            rrNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            rrDate: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            rakeId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: "rakes",
                    key: "id",
                },
            },
            consignor: DataTypes.STRING,
            consignee: DataTypes.STRING,
            freightAmount: DataTypes.DECIMAL(15, 2),
            weight: DataTypes.DECIMAL(15, 2),
        },
        {
            tableName: "railway_receipts",
            timestamps: true,
        }
    );

    RailwayReceipt.associate = (models) => {
        RailwayReceipt.belongsTo(models.RakeArrival, {
            foreignKey: "rakeId",
            as: "rake",
        });
    };

    return RailwayReceipt;
};
