const express = require('express');
const router = express.Router();

// Importar todos os módulos de rota
const customerRoutes = require('./customer.routes');
const subAccountRoutes = require('./subaccount.routes');
const webhookRoutes = require('./webhook.routes');
const shopperRoutes = require('./shopper.routes');
const subscriptionRoutes = require('./subscription.routes');

// Usar os roteadores importados
router.use('/customer', customerRoutes);
router.use('/subaccount', subAccountRoutes);
router.use('/webhook', webhookRoutes);
router.use('/shopper', shopperRoutes);
router.use('/subscription', subscriptionRoutes);

module.exports = router;
