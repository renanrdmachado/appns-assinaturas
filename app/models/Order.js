const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Order para assinaturas de produtos
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Dados do vendedor e comprador
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  shopper_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // Valor final do pedido/assinatura (inclui frete/descontos conforme regra de negócio)
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Valor final desta assinatura, usado ao criar a assinatura no provedor de pagamentos',
    validate: {
      isDecimal: true,
      min: 0.01
    }
  },

  // Detalhes da compra - um produto por pedido (1:1)
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do produto associado a este pedido'
  },
  customer_info: {
    type: DataTypes.JSON,
    allowNull: false
  },
  nuvemshop: {
    type: DataTypes.JSON,
    allowNull: true
  },

  // Status do pedido/assinatura derivada
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'overdue', 'canceled', 'pending'),
    allowNull: false,
    defaultValue: 'pending'
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Metadados e informações adicionais
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dados adicionais sobre a assinatura'
  }
});

module.exports = Order;