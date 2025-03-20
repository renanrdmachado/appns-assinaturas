const express = require('express');
const router = express.Router();
const SellerSubscriptionController = require('../controllers/sellerSubscription.controller');

// Rotas padrão RESTful para assinaturas de vendedores
router.get('/', SellerSubscriptionController.index);
router.get('/:id', SellerSubscriptionController.show);
router.post('/', SellerSubscriptionController.store);
router.put('/:id', SellerSubscriptionController.update);
router.delete('/:id', SellerSubscriptionController.destroy);

// Rota adicional para listar assinaturas de um vendedor específico
router.get('/seller/:seller_id', SellerSubscriptionController.listBySeller);

module.exports = router;
