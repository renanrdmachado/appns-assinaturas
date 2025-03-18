// Este arquivo serve apenas como um redirecionador para as rotas modulares
// em app/routes/asaas/
const express = require('express');
const router = express.Router();

// Importar os módulos de rota específicos diretamente
const customerRoutes = require('./asaas/customer.routes');
const subAccountRoutes = require('./asaas/subaccount.routes');
const webhookRoutes = require('./asaas/webhook.routes');
const shopperRoutes = require('./asaas/shopper.routes');

// Usar os roteadores importados
router.use('/customer', customerRoutes);
router.use('/subaccount', subAccountRoutes);
router.use('/webhook', webhookRoutes);
router.use('/shoppers', shopperRoutes);

module.exports = router;