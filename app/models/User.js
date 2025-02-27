const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo User
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seller_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = User;