const express = require('express');
const router = express.Router();
const SellerSubAccountController = require('../controllers/seller-subaccount.controller');

// Listar todas as subcontas de vendedores
router.get('/', SellerSubAccountController.index);

// Buscar subconta de um vendedor específico
router.get('/:seller_id', SellerSubAccountController.show);

// Criar subconta para um vendedor específico
router.post('/:seller_id', SellerSubAccountController.store);

module.exports = router;
