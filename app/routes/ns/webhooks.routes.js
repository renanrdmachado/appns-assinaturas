const express = require('express');
const router = express.Router();
const WebhooksController = require('../../controllers/ns/webhooks.controller');

// Rotas para gerenciamento de webhooks

/**
 * GET /api/ns/seller/:seller_id/webhooks
 * Lista todos os webhooks da loja
 */
router.get('/', WebhooksController.getWebhooks);

/**
 * GET /api/ns/seller/:seller_id/webhooks/:webhook_id
 * Busca webhook específico
 */
router.get('/:webhook_id', WebhooksController.getWebhookById);

/**
 * POST /api/ns/seller/:seller_id/webhooks
 * Cria novo webhook
 * Body: { event: "order/created", url: "https://meuapp.com/webhook" }
 */
router.post('/', WebhooksController.createWebhook);

/**
 * PUT /api/ns/seller/:seller_id/webhooks/:webhook_id
 * Atualiza webhook existente
 */
router.put('/:webhook_id', WebhooksController.updateWebhook);

/**
 * DELETE /api/ns/seller/:seller_id/webhooks/:webhook_id
 * Remove webhook
 */
router.delete('/:webhook_id', WebhooksController.deleteWebhook);

/**
 * POST /api/ns/seller/:seller_id/webhooks/setup-lgpd
 * Configura automaticamente todos os webhooks LGPD obrigatórios
 * Body: { base_url: "https://meuapp.com" }
 */
router.post('/setup-lgpd', WebhooksController.setupLgpdWebhooks);

/**
 * POST /api/ns/seller/:seller_id/webhooks/setup-defaults
 * Cria webhooks padrão (ex.: order/paid) apontando para /api/ns/events
 * Body: { base_url: "https://meuapp.com" }
 */
router.post('/setup-defaults', WebhooksController.setupDefaultWebhooks);

/**
 * DELETE /api/ns/seller/:seller_id/webhooks/remove-lgpd
 * Remove todos os webhooks LGPD
 */
router.delete('/remove-lgpd', WebhooksController.removeLgpdWebhooks);

module.exports = router;
