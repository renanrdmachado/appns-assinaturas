const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, addOrder } = require('../controllers/AppOrdersController');

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', addOrder);

module.exports = router;
