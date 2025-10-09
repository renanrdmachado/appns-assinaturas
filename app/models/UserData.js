const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserData = sequelize.define('UserData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mobile_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cpf_cnpj: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    get() {
      return this.getDataValue('cpf_cnpj');
    }
  },
  // Alias camelCase para compatibilidade
  cpfCnpj: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.getDataValue('cpf_cnpj');
    },
    set(value) {
      this.setDataValue('cpf_cnpj', value);
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  province: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  company_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  income_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
});

module.exports = UserData;
