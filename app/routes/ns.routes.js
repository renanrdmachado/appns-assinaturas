const express = require('express');
const router = express.Router();

// Importando rotas específicas
const authRoutes = require('./ns/auth.routes');
const productsRoutes = require('./ns/products.routes');
const ordersRoutes = require('./ns/orders.routes');
const customersRoutes = require('./ns/customers.routes');
const shoppersRoutes = require('./ns/shoppers.routes');
const subscriptionsRoutes = require('./ns/subscriptions.routes');

// Aplicando as rotas
router.use('/', authRoutes);
router.use('/seller/:seller_id/products', productsRoutes);
router.use('/seller/:seller_id/orders', ordersRoutes);
router.use('/seller/:seller_id/customers', customersRoutes);

// Novas rotas para shoppers e assinaturas, seguindo o mesmo padrão
router.use('/seller/:seller_id/shoppers', shoppersRoutes);
router.use('/seller/:seller_id', subscriptionsRoutes);

module.exports = router;
