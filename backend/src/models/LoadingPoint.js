module.exports = (sequelize, DataTypes) => {
    const LoadingPoint = sequelize.define(
        "LoadingPoint",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            code: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "Loading Point Code",
            },
            shipping_point: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "Shipping Point Code",
            },
            description: {
                type: DataTypes.STRING,
            },
            capacity: {
                type: DataTypes.INTEGER,
            },
            equipment: {
                type: DataTypes.STRING,
                comment: "e.g., Forklift, Crane",
            },
            availability: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            tableName: "LoadingPoints",
            timestamps: true,
        }
    );

    LoadingPoint.associate = (models) => {
        LoadingPoint.hasMany(models.DockSchedule, { foreignKey: 'loading_point_id', as: 'schedules' });
        LoadingPoint.hasMany(models.DeliveryOrder, { foreignKey: 'loading_point_id', as: 'deliveryOrders' });
    };

    return LoadingPoint;
};
