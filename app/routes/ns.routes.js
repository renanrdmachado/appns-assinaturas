const express = require('express');
const router = express.Router();

// Importando rotas específicas
const authRoutes = require('./ns/auth.routes');
const productsRoutes = require('./ns/products.routes');
const ordersRoutes = require('./ns/orders.routes');
const lgpdWebhooksRoutes = require('./ns/lgpd-webhooks.routes');
const webhooksRoutes = require('./ns/webhooks.routes');

// Aplicando as rotas
router.use('/', authRoutes);
router.use('/seller/:seller_id/products', productsRoutes);
router.use('/seller/:seller_id/orders', ordersRoutes);
router.use('/seller/:seller_id/webhooks', webhooksRoutes);
router.use('/lgpd-webhooks', lgpdWebhooksRoutes);

module.exports = router;
