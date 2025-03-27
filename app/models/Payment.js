const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Payment para pagamentos
const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  external_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do pagamento na plataforma de pagamento'
  },
  // Campo polimórfico para relacionar com diferentes tipos de entidades
  payable_type: {
    type: DataTypes.ENUM('seller_subscription', 'shopper_subscription'),
    allowNull: false,
    comment: 'Tipo de entidade relacionada (seller_subscription ou shopper_subscription)'
  },
  payable_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID da entidade relacionada'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'overdue', 'refunded', 'canceled', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  net_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Valor líquido após descontar taxas'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  invoice_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL para visualização/pagamento da fatura'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transaction_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dados completos da transação de pagamento'
  }
});

module.exports = Payment;
