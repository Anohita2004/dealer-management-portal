// src/models/MaterialGroup.js
module.exports = (sequelize, DataTypes) => {
const MaterialGroup = sequelize.define('MaterialGroup', {
id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true
}
,
code: { type: DataTypes.STRING, allowNull: false, unique: true },
name: { type: DataTypes.STRING, allowNull: false },
description: { type: DataTypes.TEXT, allowNull: true }
}, {
tableName: 'material_groups',
timestamps: true
});


MaterialGroup.associate = (models) => {
MaterialGroup.hasMany(models.Material, { as: 'materials', foreignKey: 'materialGroupId' });
};


return MaterialGroup;
};