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

// Rota para completar documentos do seller SEM validação de assinatura
const sellerDocumentsRoutes = require('./seller/documents.routes');

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
router.use('/app/payments', paymentRoutes);

// IMPORTANTE: Rotas específicas do seller DEVEM vir ANTES das rotas genéricas
// para evitar conflitos de matching de padrões

// Rota do seller/store SEM validação de assinatura (liberada)
router.use('/app/seller/store', sellerStoreRoutes);

// Rotas de assinaturas de sellers SEM validação (são para gerenciar, não consumir)
router.use('/app/seller-subscriptions', sellerSubscriptionRoutes);
router.use('/app/seller-subaccounts', sellerSubAccountRoutes);

// Rota para documentos do seller SEM validação de assinatura (para completar cadastro)
// DEVE vir ANTES da rota genérica /app/seller para evitar conflitos
router.use('/app/documents', sellerDocumentsRoutes);

// Rotas específicas do seller COM validação de assinatura - DEVE VIR POR ÚLTIMO
router.use('/app/seller', validateSellerSubscription, sellerSpecificRoutes);

// Rotas de integração
router.use('/ns', nsRoutes);
router.use('/asaas', asaasRoutes);

module.exports = router;
