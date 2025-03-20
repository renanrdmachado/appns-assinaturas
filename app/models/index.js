const sequelize = require('../config/database');

// Importar todos os modelos
const Seller = require('./Seller');
const User = require('./User');
const Order = require('./Order');
const Product = require('./Product');
const Shopper = require('./Shopper');
const Payment = require('./Payment');
const SellerSubscription = require('./SellerSubscription');

// Definir relacionamentos entre os modelos
User.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(User, { foreignKey: 'seller_id', as: 'users' });

// Relações para SellerSubscription
SellerSubscription.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(SellerSubscription, { foreignKey: 'seller_id', as: 'subscriptions' });

// Relações para Order (assinaturas de produtos)
Order.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(Order, { foreignKey: 'seller_id', as: 'orders' });

// Correção do relacionamento entre Order e Shopper
Order.belongsTo(Shopper, { foreignKey: 'shopper_id', as: 'shopper' });
Shopper.hasMany(Order, { foreignKey: 'shopper_id', as: 'orders' });

// Relações para produtos
Product.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });

// Relações polimórficas para pagamentos
// Não há suporte direto para relações polimórficas no Sequelize, então implementamos manualmente
// Payments para Orders
Payment.addScope('forOrder', (orderId) => ({
  where: {
    payable_type: 'order',
    payable_id: orderId
  }
}));

// Payments para SellerSubscriptions
Payment.addScope('forSellerSubscription', (subscriptionId) => ({
  where: {
    payable_type: 'seller_subscription',
    payable_id: subscriptionId
  }
}));

// Sincronizar os modelos com o banco de dados
sequelize.sync()
  .then(() => {
    console.log('Todos os modelos foram sincronizados com o banco de dados!');
  })
  .catch(err => {
    console.error('Erro ao sincronizar modelos:', err);
  });

// Exportar todos os modelos
module.exports = {
  sequelize,
  Seller,
  User,
  Order,
  Product,
  Shopper,
  Payment,
  SellerSubscription
};
