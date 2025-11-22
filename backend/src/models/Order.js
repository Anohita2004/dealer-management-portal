// src/models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    dealerId: {
      type: DataTypes.UUID,   // FIXED HERE
      allowNull: false
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM(
        'Pending',
        'Approved',
        'Rejected',
        'Processing',
        'Shipped',
        'Delivered',
        'Cancelled'
      ),
      defaultValue: 'Pending'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  Order.associate = (models) => {
    Order.belongsTo(models.Dealer, {
      as: 'dealer',
      foreignKey: 'dealerId'
    });
    Order.hasMany(models.OrderItem, {
      as: 'items',
      foreignKey: 'orderId'
    });
  };

  return Order;
};
