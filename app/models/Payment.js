const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Payment
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
  // Campos polimórficos para relacionar o pagamento
  payable_type: {
    type: DataTypes.ENUM('order', 'seller_subscription'),
    allowNull: false,
    comment: 'Tipo do objeto relacionado ao pagamento'
  },
  payable_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do objeto relacionado ao pagamento'
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID da assinatura/pedido relacionado'
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
    comment: 'Valor líquido após taxas'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data em que o pagamento foi efetuado'
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
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transaction_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dados da transação retornados pela API de pagamento'
  }
});

module.exports = Payment;
