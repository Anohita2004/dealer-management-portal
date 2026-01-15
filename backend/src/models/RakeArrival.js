module.exports = (sequelize, DataTypes) => {
    const RakeArrival = sequelize.define(
        "RakeArrival",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            rakeNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            arrivalDate: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM("Pending", "In Transit", "Arrived", "Unloading", "Completed"),
                defaultValue: "Pending",
            },
            source: DataTypes.STRING,
            destination: DataTypes.STRING,
            totalQuantity: DataTypes.DECIMAL(15, 2),
            damagedQuantity: {
                type: DataTypes.DECIMAL(15, 2),
                defaultValue: 0,
            },
            approvalStatus: {
                type: DataTypes.ENUM("pending", "approved", "rejected"),
                defaultValue: "pending",
            },
            approvedBy: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            exceptions: DataTypes.TEXT,
            regionId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
        },
        {
            tableName: "rakes",
            timestamps: true,
        }
    );

    RakeArrival.associate = (models) => {
        RakeArrival.hasMany(models.RailwayReceipt, {
            foreignKey: "rakeId",
            as: "railwayReceipts",
        });
        RakeArrival.belongsTo(models.Region, {
            foreignKey: "regionId",
            as: "region",
        });
    };

    return RakeArrival;
};
