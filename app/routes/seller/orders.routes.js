const express = require('express');
const router = express.Router({mergeParams: true});
const OrdersController = require('../../controllers/seller/orders.controller');

// Rota para listar todos os pedidos de um vendedor
router.get('/', OrdersController.getOrders);

// Rota para buscar um pedido específico pelo ID
router.get('/:order_id', OrdersController.getOrderById);

module.exports = router;