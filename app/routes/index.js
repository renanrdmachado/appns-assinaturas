const express = require('express');
const router = express.Router();

// Rotas do sistema
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const sellerRoutes = require('./seller.routes');
const userRoutes = require('./user.routes');
const shopperRoutes = require('./shopper.routes');
const sellerSubscriptionRoutes = require('./seller-subscription.routes');
const paymentRoutes = require('./payment.routes');

// Rotas de integrações
const nsRoutes = require('./ns.routes');
const asaasRoutes = require('./asaas/index');

// Configuração das rotas mantendo URLs originais
router.use('/app/products', productRoutes);
router.use('/app/orders', orderRoutes);
router.use('/app/sellers', sellerRoutes);
router.use('/app/users', userRoutes);
router.use('/app/shoppers', shopperRoutes);
router.use('/app/seller-subscriptions', sellerSubscriptionRoutes);
router.use('/app/payments', paymentRoutes);
router.use('/ns', nsRoutes);
router.use('/asaas', asaasRoutes);

module.exports = router;
