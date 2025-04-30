const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo ShopperSubscription para assinaturas dos compradores
const ShopperSubscription = sequelize.define('ShopperSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Relação com o comprador e pedido
  shopper_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do comprador que assina'
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID do pedido que originou a assinatura'
  },
  
  // Identificação externa na plataforma de pagamento
  external_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID da assinatura na plataforma de pagamento'
  },
  
  // Dados da assinatura
  plan_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome do plano assinado'
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Valor da assinatura'
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
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billing_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Metadados e informações adicionais
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Recursos disponíveis neste plano'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Dados adicionais sobre a assinatura'
  },
  
  // Campo para soft delete
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data de exclusão (soft delete)'
  }
}, {
  // Adicionar paranoid: true para habilitar o soft delete no Sequelize
  paranoid: true,
  deletedAt: 'deleted_at'
});

const Shopper = require('./Shopper');

// Adicionar associação com o modelo Shopper
ShopperSubscription.belongsTo(Shopper, {
  foreignKey: 'shopper_id',
  as: 'shopper'
});

module.exports = ShopperSubscription;
