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
    type: DataTypes.STRING,
    allowNull: false
  },
  shopper_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Identificação externa na plataforma de pagamento
  external_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID da assinatura na plataforma de pagamento'
  },
  
  // Detalhes da compra - lista de produtos comprados
  products: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array de IDs ou objetos de produtos'
  },
  customer_info: {
    type: DataTypes.JSON,
    allowNull: false
  },
  nuvemshop: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Dados da assinatura
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'overdue', 'canceled', 'pending'),
    allowNull: false,
    defaultValue: 'pending'
  },
  cycle: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Ciclo de cobrança (MONTHLY, YEARLY, etc)'
  },
  next_due_date: {
    type: DataTypes.DATE,
    allowNull: false
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
  
  // Dados de pagamento
  billing_type: {
    type: DataTypes.STRING,
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