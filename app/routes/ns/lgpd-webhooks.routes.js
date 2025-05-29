const express = require('express');
const router = express.Router();
const LgpdWebhooksController = require('../../controllers/ns/lgpd-webhooks.controller');
const { storeRedactWebhook, customersWebhook } = require('../../middleware/webhook-validation');

/**
 * @route POST /ns/lgpd-webhooks/store/redact
 * @description Webhook para exclusão de dados da loja após desinstalação do app
 * @access Public (validado por assinatura do webhook)
 * @request_body { "store_id": 123 }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory store data deletion
 */
router.post('/store/redact', 
    storeRedactWebhook,
    LgpdWebhooksController.storeRedact
);

/**
 * @route POST /ns/lgpd-webhooks/customers/redact
 * @description Webhook para exclusão de dados de clientes após inatividade
 * @access Public (validado por assinatura do webhook)
 * @request_body { "store_id": 123, "customer": {...}, "orders_to_redact": [...] }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory customer data deletion
 */
router.post('/customers/redact',
    customersWebhook,
    LgpdWebhooksController.customersRedact
);

/**
 * @route POST /ns/lgpd-webhooks/customers/data-request
 * @description Webhook para solicitação de dados de clientes
 * @access Public (validado por assinatura do webhook)
 * @request_body { "store_id": 123, "customer": {...}, "orders_requested": [...] }
 * @response Customer data in JSON format
 * @flow LGPD Compliance - handles mandatory customer data reporting
 */
router.post('/customers/data-request',
    customersWebhook,
    LgpdWebhooksController.customersDataRequest
);

module.exports = router;
