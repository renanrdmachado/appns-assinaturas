const express = require('express');
const router = express.Router();

const customerRoutes = require('./asaas/customer.routes');
const subAccountRoutes = require('./asaas/subaccount.routes');
const webhookRoutes = require('./asaas/webhook.routes');
const shopperRoutes = require('./asaas/shopper.routes');

router.use('/customer', customerRoutes);
router.use('/subaccount', subAccountRoutes);
router.use('/webhook', webhookRoutes);
router.use('/shopper', shopperRoutes);

module.exports = router;