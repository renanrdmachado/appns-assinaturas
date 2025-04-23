const express = require('express');
const router = express.Router({mergeParams: true});
const SubscriptionsController = require('../../controllers/seller/subscriptions.controller');

// Rota para listar todas as assinaturas de um vendedor
router.get('/', SubscriptionsController.getSubscriptions);

// Rota para buscar uma assinatura específica pelo ID
router.get('/:subscription_id', SubscriptionsController.getSubscriptionById);
router.get('/shopper/:shopper_id', SubscriptionsController.getShopperSubscriptions);

module.exports = router;