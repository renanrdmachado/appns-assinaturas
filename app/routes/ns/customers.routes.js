const express = require('express');
const router = express.Router({ mergeParams: true });
const NsCustomersController = require('../../controllers/ns/customers.controller');

// Rotas de clientes
router.get('/', NsCustomersController.getCustomers);
router.get('/:customer_id', NsCustomersController.getCustomerById);
router.post('/', NsCustomersController.createCustomer);
router.put('/:customer_id', NsCustomersController.updateCustomer);
router.get('/:customer_id/orders', NsCustomersController.getCustomerOrders);

module.exports = router;
