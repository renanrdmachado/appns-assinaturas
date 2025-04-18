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
    unique: true,
    allowNull: false
  },
  nuvemshop_info: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('nuvemshop_info');
      if (!value || value === "") return {};
      
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('Erro ao parser nuvemshop_info:', error.message);
        return {};
      }
    },
    set(value) {
      if (value === null || value === undefined || value === "") {
        this.setDataValue('nuvemshop_info', "{}");
        return;
      }
      
      try {
        const stringValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        
        JSON.parse(stringValue);
        this.setDataValue('nuvemshop_info', stringValue);
      } catch (error) {
        console.error('Erro ao converter nuvemshop_info para JSON:', error.message);
        this.setDataValue('nuvemshop_info', "{}");
      }
    }
  },
  nuvemshop_api_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  app_status: {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  payments_customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do cliente no sistema de pagamento (Asaas)'
  }
});

const User = require('./User');

// Adicionar associação com o modelo User
Seller.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = Seller;