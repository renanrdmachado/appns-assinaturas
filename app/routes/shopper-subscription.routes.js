const express = require('express');
const router = express.Router();
const ShopperSubscriptionController = require('../controllers/shopper-subscription.controller');

// Rotas padrão RESTful para assinaturas de compradores
router.get('/', ShopperSubscriptionController.index);
router.get('/:id', ShopperSubscriptionController.show);
// Rota para criar assinatura a partir de um pedido
router.post('/order/:order_id', ShopperSubscriptionController.store);
router.put('/:id', ShopperSubscriptionController.update);
router.delete('/:id', ShopperSubscriptionController.destroy);

// Rotas adicionais para listar assinaturas por comprador ou pedido
router.get('/shopper/:shopper_id', ShopperSubscriptionController.listByShopper);
router.get('/order/:order_id', ShopperSubscriptionController.listByOrder);

module.exports = router;
