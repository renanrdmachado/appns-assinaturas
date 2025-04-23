const express = require('express');
const router = express.Router();

// Importar rotas
const productRoutes = require('./products.routes');
const shopperRoutes = require('./shoppers.routes');
const subscriptionRoutes = require('./subscriptions.routes');
const orderRoutes = require('./orders.routes');
const storeRoutes = require('./store.routes');

// Definir rotas
router.use('/:seller_id/products', productRoutes);
router.use('/:seller_id/shoppers', shopperRoutes);
router.use('/:seller_id/subscriptions', subscriptionRoutes);
router.use('/:seller_id/orders', orderRoutes);
router.use('/store', storeRoutes);

// Rota específica para assinaturas de um shopper de um seller
const SubscriptionsController = require('../../controllers/seller/subscriptions.controller');
router.get('/:seller_id/shoppers/:shopper_id/subscriptions', SubscriptionsController.getShopperSubscriptions);

module.exports = router;