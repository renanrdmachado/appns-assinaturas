const sequelize = require('../config/database');

// Importar todos os modelos
const Seller = require('./Seller');
const User = require('./User');
const Order = require('./Order');
const Product = require('./Product');
const Shopper = require('./Shopper');
const Payment = require('./Payment');
const SellerSubscription = require('./SellerSubscription');
const ShopperSubscription = require('./ShopperSubscription');
const UserData = require('./UserData');

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

// Relacionamentos com User - correção das associações
// Defina as associações User -> entidades primeiro
User.belongsTo(UserData, { foreignKey: 'user_data_id', as: 'userData' });
UserData.hasMany(User, { foreignKey: 'user_data_id', as: 'users' });

User.hasOne(Shopper, { foreignKey: 'user_id', as: 'shopper' });
User.hasOne(Seller, { foreignKey: 'user_id', as: 'seller' });

// Depois defina as associações entidades -> User 
Shopper.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Seller.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Relações polimórficas para pagamentos
// Não há suporte direto para relações polimórficas no Sequelize, então implementamos manualmente

// Payments para SellerSubscriptions
Payment.addScope('forSellerSubscription', (subscriptionId) => ({
  where: {
    payable_type: 'seller_subscription',
    payable_id: subscriptionId
  }
}));

// Sincronizar os modelos com o banco de dados na ordem correta
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Ordem de sincronização baseada nas dependências
    await UserData.sync(); // Não depende de nenhuma tabela
    await User.sync(); // Depende de UserData
    await Seller.sync(); // Depende de User
    await Shopper.sync(); // Depende de User
    await Product.sync(); // Depende de Seller
    await Order.sync(); // Depende de Seller e Shopper
    await SellerSubscription.sync(); // Depende de Seller
    await ShopperSubscription.sync(); // Depende de Shopper e Order
    await Payment.sync(); // Depende de SellerSubscription e ShopperSubscription

    console.log('Todos os modelos foram sincronizados com sucesso!');
  } catch (error) {
    console.error('Erro ao sincronizar tabelas:', error);
  }
})();

// Exportar todos os modelos
module.exports = {
  sequelize,
  Seller,
  User,
  Order,
  Product,
  Shopper,
  Payment,
  SellerSubscription,
  ShopperSubscription,
  UserData
};