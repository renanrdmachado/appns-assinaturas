const express = require('express');
const router = express.Router({mergeParams: true});
const SubscriptionsController = require('../../controllers/seller/subscriptions.controller');

// Rota para listar todas as assinaturas de um vendedor
router.get('/', SubscriptionsController.getSubscriptions);

// Rota para buscar uma assinatura específica pelo ID
router.get('/:subscription_id', SubscriptionsController.getSubscriptionById);

// Rota para buscar assinaturas de um shopper específico
router.get('/shopper/:shopper_id', SubscriptionsController.getShopperSubscriptions);

// Novas rotas para edição de assinaturas
/**
 * @route PUT /sellers/:seller_id/subscriptions/:subscription_id
 * @desc Atualiza uma assinatura completa
 * @access Proprietário ou Admin
 */
router.put('/:subscription_id', SubscriptionsController.updateSubscription);

/**
 * @route PATCH /sellers/:seller_id/subscriptions/:subscription_id/status
 * @desc Atualiza apenas o status da assinatura (ativa, pausada, cancelada)
 * @access Proprietário ou Admin
 */
router.patch('/:subscription_id/status', SubscriptionsController.updateSubscriptionStatus);

/**
 * @route PATCH /sellers/:seller_id/subscriptions/:subscription_id/price
 * @desc Atualiza preço da assinatura
 * @access Proprietário ou Admin
 */
router.patch('/:subscription_id/price', SubscriptionsController.updateSubscriptionPrice);

module.exports = router;