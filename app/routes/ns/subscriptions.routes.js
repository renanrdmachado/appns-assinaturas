const express = require('express');
const router = express.Router({ mergeParams: true }); // Importante para acessar seller_id
const SubscriptionsController = require('../../controllers/ns/subscriptions.controller');

// Rotas para acesso às assinaturas de shoppers de um seller
router.get('/subscriptions', SubscriptionsController.getSubscriptions);
router.get('/subscriptions/:subscription_id', SubscriptionsController.getSubscriptionById);
router.get('/shoppers/:shopper_id/subscriptions', SubscriptionsController.getShopperSubscriptions);

module.exports = router;