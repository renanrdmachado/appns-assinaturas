const express = require('express');
const router = express.Router();
const AsaasSubscriptionController = require('../../controllers/asaas/subscription.controller');

/**
 * @route POST /asaas/subscription
 * @description Cria uma assinatura no Asaas
 * @access Private
 */
router.post('/', AsaasSubscriptionController.store);

/**
 * @route GET /asaas/subscription
 * @description Lista todas as assinaturas no Asaas
 * @access Private
 */
router.get('/', AsaasSubscriptionController.index);

/**
 * @route GET /asaas/subscription/:id
 * @description Obtém assinatura do Asaas pelo ID
 * @param {string} id - ID da assinatura
 * @access Private
 */
router.get('/:id', AsaasSubscriptionController.show);

/**
 * @route PUT /asaas/subscription/:id
 * @description Atualiza assinatura no Asaas
 * @param {string} id - ID da assinatura
 * @access Private
 */
router.put('/:id', AsaasSubscriptionController.update);

/**
 * @route DELETE /asaas/subscription/:id
 * @description Deleta assinatura no Asaas
 * @param {string} id - ID da assinatura
 * @access Private
 */
router.delete('/:id', AsaasSubscriptionController.destroy);

/**
 * @route GET /asaas/subscription/customer/:customer_id
 * @description Lista assinaturas por cliente
 * @param {string} customer_id - ID do cliente
 * @access Private
 */
router.get('/customer/:customer_id', AsaasSubscriptionController.listByCustomer);

module.exports = router;
