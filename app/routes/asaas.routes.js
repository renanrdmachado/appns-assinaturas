const express = require('express');
const router = express.Router();
const { addCustomer, addSubAccount, getSubAccount } = require('../controllers/AsaasController');

router.post('/customer', addCustomer);
router.post('/subaccount/:id', addSubAccount);
router.get('/subaccount', getSubAccount);

module.exports = router;