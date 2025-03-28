const express = require('express');
const router = express.Router({ mergeParams: true }); // Importante para acessar seller_id
const NsOrdersController = require('../../controllers/ns/orders.controller');

// Rotas de pedidos
router.get('/', NsOrdersController.getOrders);
router.get('/:order_id', NsOrdersController.getOrderById);
router.post('/', NsOrdersController.createOrder);
router.put('/:order_id', NsOrdersController.updateOrder);
router.post('/:order_id/close', NsOrdersController.closeOrder);
router.post('/:order_id/open', NsOrdersController.openOrder);
router.post('/:order_id/cancel', NsOrdersController.cancelOrder);
router.get('/:order_id/payments', NsOrdersController.getOrderPayments);

module.exports = router;
