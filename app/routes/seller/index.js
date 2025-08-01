const express = require('express');
const router = express.Router();

// Importar controlador do seller
const SellerController = require('../../controllers/seller.controller');

// Importar rotas
const productRoutes = require('./products.routes');
const shopperRoutes = require('./shoppers.routes');
const subscriptionRoutes = require('./subscriptions.routes');
const orderRoutes = require('./orders.routes');

// Definir rotas
router.use('/:seller_id/products', productRoutes);
router.use('/:seller_id/shoppers', shopperRoutes);
router.use('/:seller_id/subscriptions', subscriptionRoutes);
router.use('/:seller_id/orders', orderRoutes);

// Rota específica para assinaturas de um shopper de um seller
const SubscriptionsController = require('../../controllers/seller/subscriptions.controller');
router.get('/:seller_id/shoppers/:shopper_id/subscriptions', SubscriptionsController.getShopperSubscriptions);

// Rotas para payment methods
router.get('/:seller_id/payment-methods', SellerController.getPaymentMethods);
router.post('/:seller_id/payment-methods', SellerController.addPaymentMethod);
router.patch('/:seller_id/payment-methods', SellerController.updatePaymentMethods);
router.put('/:seller_id/payment-methods/:method', SellerController.updateSinglePaymentMethod);
router.delete('/:seller_id/payment-methods', SellerController.removePaymentMethod);

module.exports = router;