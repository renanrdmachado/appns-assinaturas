const express = require('express');
const router = express.Router();
const SellerSubscriptionController = require('../controllers/seller-subscription.controller');

// Rotas padrão RESTful para assinaturas de vendedores
router.get('/', SellerSubscriptionController.index);
router.get('/:id', SellerSubscriptionController.show);
// Rota modificada para criar assinatura com ID do vendedor na URL
router.post('/seller/:seller_id', SellerSubscriptionController.store);
router.put('/:id', SellerSubscriptionController.update);
router.delete('/:id', SellerSubscriptionController.destroy);

// Rota adicional para listar assinaturas de um vendedor específico
router.get('/seller/:seller_id', SellerSubscriptionController.listBySeller);

// Rota para retry de assinatura com método de pagamento diferente
router.post('/seller/:seller_id/retry-payment', SellerSubscriptionController.retryPaymentMethod);

module.exports = router;
