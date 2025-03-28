const express = require('express');
const router = express.Router();

// Importar todos os módulos de rota
const customerRoutes = require('./asaas/customer.routes');
const subAccountRoutes = require('./asaas/subaccount.routes');
const webhookRoutes = require('./asaas/webhook.routes');
const shopperRoutes = require('./asaas/shopper.routes');
const subscriptionRoutes = require('./asaas/subscription.routes');

// Usar os roteadores importados
router.use('/customer', customerRoutes);
router.use('/subaccount', subAccountRoutes);
router.use('/webhook', webhookRoutes);
router.use('/shopper', shopperRoutes);
router.use('/subscription', subscriptionRoutes);

module.exports = router;
