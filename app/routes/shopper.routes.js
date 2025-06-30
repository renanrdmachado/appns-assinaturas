const express = require('express');
const router = express.Router();
const ShopperController = require('../controllers/shopper.controller');

// Rotas para shoppers
router.get('/', ShopperController.index);
router.post('/', ShopperController.store);
router.get('/nuvemshop/:nuvemshopId', ShopperController.showByNuvemshopId);
router.get('/:id', ShopperController.show);
router.put('/:id', ShopperController.update);
router.delete('/:id', ShopperController.destroy);
router.post('/:id/sync-asaas', ShopperController.syncWithAsaas);

module.exports = router;
