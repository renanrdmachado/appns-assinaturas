const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');

router.get('/', OrderController.index);
router.get('/:id', OrderController.show);
router.post('/', OrderController.store);
router.put('/:id', OrderController.update);
router.delete('/:id', OrderController.destroy);

module.exports = router;
