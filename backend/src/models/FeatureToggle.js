module.exports = (sequelize, DataTypes) => {
  const FeatureToggle = sequelize.define('FeatureToggle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    config: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'feature_toggles',
    timestamps: true
  });

  return FeatureToggle;
};

