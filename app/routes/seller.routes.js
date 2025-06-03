const express = require('express');
const router = express.Router();
const SellerController = require('../controllers/seller.controller');

router.get('/', SellerController.index);
router.get('/:id', SellerController.show);
router.post('/', SellerController.store);
router.put('/:id', SellerController.update);
router.delete('/:id', SellerController.destroy);

// Rotas específicas para este controlador
router.post('/:id/subaccount', SellerController.addSubAccount);
// Nova rota para sincronização com o Asaas
router.post('/:id/sync-asaas', SellerController.syncWithAsaas);

// Novas rotas para gerenciar métodos de pagamento
router.patch('/:id/payment-methods', SellerController.updatePaymentMethods);
router.post('/:id/payment-methods', SellerController.addPaymentMethod);
router.delete('/:id/payment-methods', SellerController.removePaymentMethod);

module.exports = router;
