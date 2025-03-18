const express = require('express');
const router = express.Router();

// Rotas do sistema
const productRoutes = require('./product.routes');
const orderRoutes = require('./order.routes');
const sellerRoutes = require('./seller.routes');
const userRoutes = require('./user.routes');

// Rotas de integrações
const nsRoutes = require('./ns.routes');
const asaasRoutes = require('./asaas.routes');

// Configuração das rotas mantendo URLs originais
router.use('/app/products', productRoutes);
router.use('/app/orders', orderRoutes);
router.use('/app/sellers', sellerRoutes);
router.use('/app/users', userRoutes);
router.use('/ns', nsRoutes);
router.use('/asaas', asaasRoutes);

module.exports = router;
