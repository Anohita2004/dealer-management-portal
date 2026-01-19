module.exports = (sequelize, DataTypes) => {
    const DockSchedule = sequelize.define(
        "DockSchedule",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            loading_point_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "LoadingPoints", key: "id" },
            },
            delivery_order_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: "DeliveryOrders", key: "id" },
            },
            scheduled_start: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            scheduled_end: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM("SCHEDULED", "OCCUPIED", "COMPLETED", "CANCELLED"),
                defaultValue: "SCHEDULED",
            },
        },
        {
            tableName: "DockSchedules",
            timestamps: true,
        }
    );

    DockSchedule.associate = (models) => {
        DockSchedule.belongsTo(models.LoadingPoint, { foreignKey: 'loading_point_id', as: 'loadingPoint' });
        DockSchedule.belongsTo(models.DeliveryOrder, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' });
    };

    return DockSchedule;
};
