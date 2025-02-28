const express = require('express');
const router = express.Router();
const { 
    getOrders, 
    getOrderById, 
    addOrder,
    updateOrder,
    deleteOrder
} = require('../controllers/AppOrdersController');

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', addOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;
