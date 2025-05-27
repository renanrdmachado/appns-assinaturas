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
  },
  accepted_payment_methods: {
    type: DataTypes.JSON,
    defaultValue: ['credit_card', 'pix', 'boleto'],
    get() {
      const value = this.getDataValue('accepted_payment_methods');
      if (!value) return ['credit_card', 'pix', 'boleto'];
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    set(value) {
      this.setDataValue('accepted_payment_methods', JSON.stringify(value));
    }
  }
});

const User = require('./User');

// Adicionar associação com o modelo User
Seller.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Métodos para gerenciar formas de pagamento
Seller.prototype.isPaymentMethodAccepted = function(method) {
  const acceptedMethods = this.accepted_payment_methods || ['credit_card', 'pix', 'boleto'];
  return acceptedMethods.includes(method);
};

Seller.prototype.addPaymentMethod = function(method) {
  const validMethods = ['credit_card', 'pix', 'boleto'];
  if (!validMethods.includes(method)) {
    throw new Error(`Método de pagamento inválido: ${method}`);
  }
  
  let currentMethods = this.accepted_payment_methods || [];
  if (!currentMethods.includes(method)) {
    currentMethods.push(method);
    this.accepted_payment_methods = currentMethods;
  }
};

Seller.prototype.removePaymentMethod = function(method) {
  let currentMethods = this.accepted_payment_methods || [];
  this.accepted_payment_methods = currentMethods.filter(m => m !== method);
};

module.exports = Seller;