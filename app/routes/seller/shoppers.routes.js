const express = require('express');
const router = express.Router({ mergeParams: true });
const SellerShoppersController = require('../../controllers/seller/shoppers.controller');

/**
 * @route GET /sellers/:seller_id/shoppers
 * @desc Lista todos os shoppers (clientes) vinculados a um seller
 * @access Privado
 */
router.get('/', SellerShoppersController.getShoppers);

/**
 * @route GET /sellers/:seller_id/shoppers/:shopper_id
 * @desc Busca um shopper específico vinculado a um seller
 * @access Privado
 */
router.get('/:shopper_id', SellerShoppersController.getShopperById);

module.exports = router;