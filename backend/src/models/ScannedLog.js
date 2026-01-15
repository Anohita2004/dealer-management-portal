module.exports = (sequelize, DataTypes) => {
    const ScannedLog = sequelize.define('ScannedLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        barcode: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        scannedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'scanned_logs',
        timestamps: true
    });

    ScannedLog.associate = (models) => {
        ScannedLog.belongsTo(models.User, { foreignKey: 'userId', as: 'scanner' });
    };

    return ScannedLog;
};
