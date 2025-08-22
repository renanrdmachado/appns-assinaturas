const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserData = sequelize.define('UserData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mobilePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cpfCnpj: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  addressNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  province: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = UserData;
