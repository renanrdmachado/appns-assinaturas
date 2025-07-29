const express = require('express');
const router = express.Router();

// Middleware de validação de assinatura para rotas do seller
const validateSellerSubscription = require('../middleware/subscription-validation');

// Rotas do sistema
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const sellerRoutes = require('./seller.routes');
// const userRoutes = require('./user.routes'); // Removido, não utilizado
const shopperRoutes = require('./shopper.routes');
const shopperSubscriptionRoutes = require('./shopper-subscription.routes');
const sellerSubscriptionRoutes = require('./seller-subscription.routes');
const sellerSubAccountRoutes = require('./seller-subaccount.routes');
const paymentRoutes = require('./payment.routes');

// Rotas específicas do seller (organizadas por recursos)
const sellerSpecificRoutes = require('./seller');

// Rota do seller/store SEM validação de assinatura (liberada)
const sellerStoreRoutes = require('./seller/store.routes');

// Rotas de integrações
const nsRoutes = require('./ns.routes');
const asaasRoutes = require('./asaas.routes');

// Configuração das rotas mantendo URLs originais
router.use('/app/products', productRoutes);
router.use('/app/orders', orderRoutes);
router.use('/app/sellers', sellerRoutes);
// router.use('/app/users', userRoutes);
router.use('/app/shoppers', shopperRoutes);
router.use('/app/shopper-subscriptions', shopperSubscriptionRoutes);
// Rotas de assinaturas de sellers SEM validação (são para gerenciar, não consumir)
router.use('/app/seller-subscriptions', sellerSubscriptionRoutes);
router.use('/app/seller-subaccounts', sellerSubAccountRoutes);
router.use('/app/payments', paymentRoutes);

// Rota do seller/store SEM validação de assinatura (liberada) - DEVE VIR ANTES do middleware
router.use('/app/seller/store', sellerStoreRoutes);

// Rotas específicas do seller COM validação de assinatura
router.use('/app/seller', validateSellerSubscription, sellerSpecificRoutes);

// Rotas de integração
router.use('/ns', nsRoutes);
router.use('/asaas', asaasRoutes);

module.exports = router;
