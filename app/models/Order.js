const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Order
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seller_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  products: {
    type: DataTypes.JSON,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_info: {
    type: DataTypes.JSON,
    allowNull: false
  },
  nuvemshop: {
    type: DataTypes.JSON,
    allowNull: true
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  cycle: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = Order;