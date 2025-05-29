const express = require('express');
const router = express.Router();
const LgpdWebhooksController = require('../../controllers/ns/lgpd-webhooks.controller');
const {
    validateNuvemshopWebhook,
    validateStoreRedactWebhook,
    validateCustomersWebhook,
    logWebhookReceived
} = require('../../middleware/webhook-validation');

/**
 * @route POST /ns/lgpd-webhooks/store/redact
 * @description Webhook para exclusão de dados da loja após desinstalação do app
 * @access Public (validado por assinatura do webhook)
 * @request_body {
 *   "shop_id": "12345",
 *   "shop_domain": "test-store.mitiendanube.com"
 * }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory store data deletion
 */
router.post('/store/redact', 
    logWebhookReceived('store/redact'),
    validateNuvemshopWebhook,
    validateStoreRedactWebhook,
    LgpdWebhooksController.storeRedact
);

/**
 * @route POST /ns/lgpd-webhooks/customers/redact
 * @description Webhook para exclusão de dados de clientes após inatividade
 * @access Public (validado por assinatura do webhook)
 * @request_body {
 *   "shop_id": "12345",
 *   "customer": {
 *     "id": "67890",
 *     "email": "customer@example.com",
 *     "identification": "12345678901"
 *   }
 * }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory customer data deletion
 */
router.post('/customers/redact',
    logWebhookReceived('customers/redact'),
    validateNuvemshopWebhook,
    validateCustomersWebhook,
    LgpdWebhooksController.customersRedact
);

/**
 * @route POST /ns/lgpd-webhooks/customers/data-request
 * @description Webhook para solicitação de dados de clientes
 * @access Public (validado por assinatura do webhook)
 * @request_body {
 *   "shop_id": "12345",
 *   "customer": {
 *     "id": "67890",
 *     "email": "customer@example.com",
 *     "identification": "12345678901"
 *   }
 * }
 * @response Customer data in JSON format
 * @flow LGPD Compliance - handles mandatory customer data reporting
 */
router.post('/customers/data-request',
    logWebhookReceived('customers/data-request'),
    validateNuvemshopWebhook,
    validateCustomersWebhook,
    LgpdWebhooksController.customersDataRequest
);

module.exports = router;
