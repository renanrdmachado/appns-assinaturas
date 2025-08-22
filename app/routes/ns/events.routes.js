const express = require('express');
const router = express.Router();
const NsEventsController = require('../../controllers/ns/events.controller');
const { nuvemshopWebhook } = require('../../middleware/webhook-validation');

// Endpoint genérico que recebe qualquer evento NS (order/paid, order/created, etc.)
// Exemplo de URL final: https://seuapp.com/api/ns/events
router.post('/', nuvemshopWebhook(['store_id', 'event']), NsEventsController.receive);

module.exports = router;
