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

      try {
        const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        // Garantir que é um array válido
        if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
          return ['credit_card', 'pix', 'boleto'];
        }
        return parsedValue;
      } catch (error) {
        console.error('Erro ao obter accepted_payment_methods:', error.message);
        return ['credit_card', 'pix', 'boleto'];
      }
    },
    set(value) {
      try {
        // Garantir que temos valores válidos para salvar
        if (!value || !Array.isArray(value) || value.length === 0) {
          this.setDataValue('accepted_payment_methods', JSON.stringify(['credit_card', 'pix', 'boleto']));
        } else {
          this.setDataValue('accepted_payment_methods', JSON.stringify(value));
        }
      } catch (error) {
        console.error('Erro ao definir accepted_payment_methods:', error.message);
        this.setDataValue('accepted_payment_methods', JSON.stringify(['credit_card', 'pix', 'boleto']));
      }
    }
  }
});

// Associações são definidas centralmente em models/index.js

// Métodos para gerenciar formas de pagamento
Seller.prototype.isPaymentMethodAccepted = function (method) {
  let acceptedMethods = this.accepted_payment_methods;

  // Garantir que temos um array válido
  if (!acceptedMethods || !Array.isArray(acceptedMethods) || acceptedMethods.length === 0) {
    acceptedMethods = ['credit_card', 'pix', 'boleto'];
  }

  return acceptedMethods.includes(method);
};

Seller.prototype.addPaymentMethod = function (method) {
  const validMethods = ['credit_card', 'pix', 'boleto'];
  if (!validMethods.includes(method)) {
    throw new Error(`Método de pagamento inválido: ${method}`);
  }

  try {
    let currentMethods = this.accepted_payment_methods;

    // Garantir que temos um array válido
    if (!currentMethods || !Array.isArray(currentMethods)) {
      currentMethods = ['credit_card', 'pix', 'boleto'];
    }

    if (!currentMethods.includes(method)) {
      currentMethods.push(method);
      this.accepted_payment_methods = currentMethods;
    }
  } catch (error) {
    console.error('Erro ao adicionar método de pagamento:', error.message);
    this.accepted_payment_methods = ['credit_card', 'pix', 'boleto'];
  }
};

Seller.prototype.removePaymentMethod = function (method) {
  try {
    let currentMethods = this.accepted_payment_methods;

    // Garantir que temos um array válido
    if (!currentMethods || !Array.isArray(currentMethods)) {
      currentMethods = ['credit_card', 'pix', 'boleto'];
    }

    // Remover o método especificado
    const updatedMethods = currentMethods.filter(m => m !== method);

    // Garantir que não removemos todos os métodos
    if (updatedMethods.length === 0) {
      console.warn(`Tentativa de remover único método de pagamento: ${method}. Mantendo método padrão.`);
      updatedMethods.push('credit_card');
    }

    this.accepted_payment_methods = updatedMethods;
  } catch (error) {
    console.error('Erro ao remover método de pagamento:', error.message);
    this.accepted_payment_methods = ['credit_card', 'pix', 'boleto'];
  }
};

module.exports = Seller;