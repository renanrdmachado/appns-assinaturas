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

module.exports = router;
