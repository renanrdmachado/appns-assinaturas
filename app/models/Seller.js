const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Seller
const Seller = sequelize.define('Seller', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nuvemshop_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nuvemshop_info: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('nuvemshop_info');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('nuvemshop_info', JSON.stringify(value || {}));
    }
  },
  nuvemshop_api_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payments_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payments_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payments_next_due: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payments_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_wallet_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_api_key: {
    type: DataTypes.STRING,
    allowNull: true
  },
  app_start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  app_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_cpfCnpj: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_mobilePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_site: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_incomeValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  Asaas_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_addressNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_province: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_postalCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_loginEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_birthDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Seller;