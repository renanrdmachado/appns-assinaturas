const express = require('express');
const router = express.Router();
const SubscriptionController = require('../../controllers/asaas/subscription.controller');

// Rotas para assinaturas Asaas
router.get('/', SubscriptionController.index);
router.post('/', SubscriptionController.store);
router.get('/:id', SubscriptionController.show);
router.put('/:id', SubscriptionController.update);
router.delete('/:id', SubscriptionController.destroy);
router.get('/customer/:customer_id', SubscriptionController.listByCustomer);

module.exports = router;
