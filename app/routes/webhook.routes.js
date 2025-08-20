const express = require('express');
const router = express.Router();
const LgpdWebhooksController = require('../controllers/ns/lgpd-webhooks.controller');
const { storeRedactWebhook, customersWebhook, customersDataRequestWebhook } = require('../middleware/webhook-validation');

// Rotas de compatibilidade com as URLs configuradas na instalação do app
// Excluir dados da loja (store redact)
// POST https://assinaturas.appns.com.br/webhook/store
router.post('/store', storeRedactWebhook, LgpdWebhooksController.storeRedact);

// Excluir dados do cliente (customers redact)
// POST https://assinaturas.appns.com.br/webhook/customer
router.post('/customer', customersWebhook, LgpdWebhooksController.customersRedact);

// Solicitação de dados do cliente (customers data request)
// POST https://assinaturas.appns.com.br/webhook/customer_data
router.post('/customer_data', customersDataRequestWebhook, LgpdWebhooksController.customersDataRequest);

module.exports = router;
