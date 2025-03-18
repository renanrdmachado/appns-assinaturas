const express = require('express');
const router = express.Router();
const { 
    getSellers, 
    getSellerById, 
    addSeller,
    getSellerSubscriptions,
    addSellerSubscription,
    updateSeller,
    deleteSeller,
    addSellerSubAccount
} = require('../controllers/seller.controller');

router.get('/', getSellers);
router.get('/:id', getSellerById);
router.post('/', addSeller);
router.get('/:id/subscriptions', getSellerSubscriptions);
router.post('/:id/subscriptions', addSellerSubscription);
router.post('/:id/subaccount', addSellerSubAccount);
router.put('/:id', updateSeller);
router.delete('/:id', deleteSeller);

module.exports = router;
