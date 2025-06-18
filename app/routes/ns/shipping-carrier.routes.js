const express = require('express');
const ShippingCarrierController = require('../../controllers/ns/shipping-carrier.controller');

const router = express.Router();

/**
 * @route POST /api/shipping-carrier/rates
 * @desc Endpoint para cálculo de preços de frete para a transportadora integrada à Nuvemshop
 * @access Public - Este endpoint deve ser acessível publicamente para a Nuvemshop
 */
router.post('/rates', ShippingCarrierController.calculateShippingRates);

/**
 * @route GET /seller/:seller_id/shipping-carriers
 * @desc Listar todas as transportadoras disponíveis para a loja
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/shipping-carriers', ShippingCarrierController.getShippingCarriers);

/**
 * @route GET /seller/:seller_id/shipping-carriers/:carrier_id
 * @desc Obter detalhes de uma transportadora específica
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/shipping-carriers/:carrier_id', ShippingCarrierController.getShippingCarrier);

/**
 * @route GET /seller/:seller_id/shipping-carriers/:carrier_id/options
 * @desc Listar opções de uma transportadora
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/shipping-carriers/:carrier_id/options', ShippingCarrierController.getShippingCarrierOptions);

/**
 * @route GET /seller/:seller_id/shipping-carriers/:carrier_id/options/:option_id
 * @desc Obter detalhes de uma opção específica
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/shipping-carriers/:carrier_id/options/:option_id', ShippingCarrierController.getShippingCarrierOption);

/**
 * @route GET /seller/:seller_id/orders/:order_id/fulfillments
 * @desc Listar eventos de entrega de um pedido
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/orders/:order_id/fulfillments', ShippingCarrierController.getFulfillmentEvents);

/**
 * @route GET /seller/:seller_id/orders/:order_id/fulfillments/:event_id
 * @desc Obter detalhes de um evento de entrega
 * @access Private - Requer autenticação
 */
router.get('/seller/:seller_id/orders/:order_id/fulfillments/:event_id', ShippingCarrierController.getFulfillmentEvent);

module.exports = router;
