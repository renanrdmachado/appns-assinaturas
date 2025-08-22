const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true, // Nome de usuário opcional para clientes que não criam conta
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Senha opcional para clientes que não criam conta
  },
  user_data_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

// Associações são definidas centralmente em models/index.js

module.exports = User;