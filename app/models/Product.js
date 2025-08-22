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
  type: DataTypes.INTEGER,
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
  subscription_price: {
    type: DataTypes.FLOAT,
    allowNull: true
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
  },
  tags: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Métodos para calcular preços
Product.prototype.getUnitPrice = function() {
  return this.price;
};

Product.prototype.getSubscriptionPrice = function() {
  return this.subscription_price || this.price;
};

module.exports = Product;