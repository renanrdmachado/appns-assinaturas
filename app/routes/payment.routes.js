const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');

// Rotas padrão para pagamentos
router.get('/', PaymentController.index);
router.get('/:id', PaymentController.show);
router.put('/:id', PaymentController.update);

// Rotas para pagamentos de pedidos (orders)
// Rota de compatibilidade: listar pagamentos por Order (derivado de ShopperSubscription)
router.get('/order/:order_id', PaymentController.listByOrder);

// Rotas para pagamentos de assinaturas de vendedores
router.get('/subscription/:subscription_id', PaymentController.listBySellerSubscription);
router.post('/subscription/:subscription_id', PaymentController.storeForSellerSubscription);

module.exports = router;
