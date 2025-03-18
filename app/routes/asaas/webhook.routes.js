const express = require('express');
const router = express.Router();
const {
    registerWebhook,
    getWebhooks,
    getWebhookById,
    updateWebhook,
    deleteWebhook,
    receiveWebhook
} = require('../../controllers/asaas/webhook.controller');

/**
 * @route POST /asaas/webhook/register
 * @description Registers a webhook in Asaas to receive payment status updates
 * @access Private - Admin only
 * @request_body {
 *   "name": "Webhook name",
 *   "url": "Webhook URL",
 *   "email": "Notification email (optional)",
 *   "enabled": true,
 *   "interrupted": false,
 *   "authToken": "Authentication token (optional)",
 *   "sendType": "SEQUENTIALLY",
 *   "events": ["PAYMENT_CREATED", "PAYMENT_UPDATED", ...]
 * }
 * @response Webhook registration confirmation
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 * @flow System setup - configures Asaas to notify the application about payment events
 */
router.post('/register', registerWebhook);

/**
 * @route GET /asaas/webhook
 * @description Lists all registered webhooks
 * @access Private - Admin only
 * @response Array of webhook objects
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 */
router.get('/', getWebhooks);

/**
 * @route GET /asaas/webhook/:id
 * @description Gets a specific webhook by ID
 * @access Private - Admin only
 * @param {string} id - Webhook ID
 * @response Webhook object
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 */
router.get('/:id', getWebhookById);

/**
 * @route PUT /asaas/webhook/:id
 * @description Updates a specific webhook
 * @access Private - Admin only
 * @param {string} id - Webhook ID
 * @request_body Webhook data to update
 * @response Updated webhook object
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 */
router.put('/:id', updateWebhook);

/**
 * @route DELETE /asaas/webhook/:id
 * @description Deletes a specific webhook
 * @access Private - Admin only
 * @param {string} id - Webhook ID
 * @response Success message
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 */
router.delete('/:id', deleteWebhook);

/**
 * @route POST /asaas/webhook/receive
 * @description Endpoint that receives webhook notifications from Asaas
 * @access Public (with authentication from Asaas)
 * @request_body Webhook payload from Asaas
 * @response {
 *   "success": true,
 *   "message": "Webhook processed successfully"
 * }
 * @flow Payment processing - handles payment status updates from Asaas
 */
router.post('/receive', receiveWebhook);

module.exports = router;
