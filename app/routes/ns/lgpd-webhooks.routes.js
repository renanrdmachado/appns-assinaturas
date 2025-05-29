const express = require('express');
const router = express.Router();
const LgpdWebhooksController = require('../../controllers/ns/lgpd-webhooks.controller');
const {
    captureRawBody,
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
 *   "store_id": 123
 * }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory store data deletion
 */
router.post('/store/redact', 
    captureRawBody,
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
 *   "store_id": 123,
 *   "customer": {
 *     "id": 1,
 *     "email": "customer@example.com",
 *     "phone": "+55...",
 *     "identification": "12345678901"
 *   },
 *   "orders_to_redact": [213, 3415, 21515]
 * }
 * @response Success confirmation
 * @flow LGPD Compliance - handles mandatory customer data deletion
 */
router.post('/customers/redact',
    captureRawBody,
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
 *   "store_id": 123,
 *   "customer": {
 *     "id": 1,
 *     "email": "customer@example.com",
 *     "phone": "+55...",
 *     "identification": "12345678901"
 *   },
 *   "orders_requested": [213, 3415, 21515],
 *   "checkouts_requested": [214, 3416, 21518],
 *   "drafts_orders_requested": [10, 1245, 5456],
 *   "data_request": {
 *     "id": 456
 *   }
 * }
 * @response Customer data in JSON format
 * @flow LGPD Compliance - handles mandatory customer data reporting
 */
router.post('/customers/data-request',
    captureRawBody,
    logWebhookReceived('customers/data-request'),
    validateNuvemshopWebhook,
    validateCustomersWebhook,
    LgpdWebhooksController.customersDataRequest
);

module.exports = router;
