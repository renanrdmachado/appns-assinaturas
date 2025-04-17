const express = require('express');
const router = express.Router({ mergeParams: true }); // Importante para acessar seller_id
const ShoppersController = require('../../controllers/ns/shoppers.controller');

// Rotas para acesso aos shoppers (clientes) de um seller
router.get('/', ShoppersController.getShoppers);
router.get('/:shopper_id', ShoppersController.getShopperById);

module.exports = router;