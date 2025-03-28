const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Product
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seller_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  }
  // Removida a adição do campo nuvemshop_id conforme solicitado
});

module.exports = Product;