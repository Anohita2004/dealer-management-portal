module.exports = (sequelize, DataTypes) => {
    const InsuranceClaim = sequelize.define(
        "InsuranceClaim",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            delivery_order_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: 'DeliveryOrders', key: 'id' },
            },
            material_code: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            quantity: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            reason: {
                type: DataTypes.ENUM("DAMAGED_IN_TRANSIT", "SHORT_SUPPLY", "WRONG_MATERIAL", "OTHER"),
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
            },
            status: {
                type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "SETTLED"),
                defaultValue: "DRAFT",
            },
            evidence_urls: {
                type: DataTypes.JSONB, // Array of URLs
                defaultValue: [],
            },
            sap_claim_id: {
                type: DataTypes.STRING,
            },
            resolution_amount: {
                type: DataTypes.DECIMAL(15, 2),
            },
        },
        {
            tableName: "InsuranceClaims",
            timestamps: true,
        }
    );

    InsuranceClaim.associate = (models) => {
        InsuranceClaim.belongsTo(models.DeliveryOrder, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' });
    };

    return InsuranceClaim;
};
