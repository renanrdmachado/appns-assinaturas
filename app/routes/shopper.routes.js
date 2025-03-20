const express = require('express');
const router = express.Router();
const ShopperController = require('../controllers/shopper.controller');

// Rotas padrão RESTful para Shoppers
router.get('/', ShopperController.index);
router.get('/:id', ShopperController.show);
router.post('/', ShopperController.store);
router.put('/:id', ShopperController.update);
router.delete('/:id', ShopperController.destroy);

// Rota adicional para buscar pelo nuvemshop_id externo
router.get('/external/:nuvemshop_id', ShopperController.findByNuvemshopId);

module.exports = router;
