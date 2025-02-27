const express = require('express');
const router = express.Router();
const { 
    getSellers, 
    getSellerById, 
    addSeller,
    getSellerSubscriptions,
    addSellerSubscription,
    updateSeller,
    deleteSeller
} = require('../controllers/AppSellersController');

router.get('/', getSellers);
router.get('/:id', getSellerById);
router.post('/', addSeller);
router.get('/:id/subscriptions', getSellerSubscriptions);
router.post('/:id/subscriptions', addSellerSubscription);
router.put('/:id', updateSeller);
router.delete('/:id', deleteSeller);

module.exports = router;
