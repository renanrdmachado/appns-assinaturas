const sequelize = require('../config/database');

// Importar todos os modelos
const Seller = require('./Seller');
const User = require('./User');
const Order = require('./Order');
const Product = require('./Product');

// Definir relacionamentos entre os modelos
// Por exemplo:
User.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(User, { foreignKey: 'seller_id', as: 'users' });

Order.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(Order, { foreignKey: 'seller_id', as: 'orders' });

Product.belongsTo(Seller, { foreignKey: 'seller_id', as: 'seller' });
Seller.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });

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
  Product
};
