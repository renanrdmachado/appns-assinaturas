const express = require('express');
const router = express.Router();
const { addCustomer } = require('../controllers/AsaasController');

router.post('/customer', addCustomer);

module.exports = router;