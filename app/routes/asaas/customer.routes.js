const express = require('express');
const router = express.Router();
const AsaasCustomerController = require('../../controllers/asaas/customer.controller');

/**
 * @route POST /asaas/customer/:groupName
 * @description Cria ou atualiza um cliente no Asaas no grupo especificado
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @access Private
 */
router.post('/:groupName', AsaasCustomerController.createOrUpdate);

/**
 * @route GET /asaas/customer/group/:groupName
 * @description Lista clientes por grupo (SELLERS ou SHOPPERS)
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @query offset, limit - Paginação
 * @access Private
 */
router.get('/group/:groupName', AsaasCustomerController.listByGroup);

/**
 * @route GET /asaas/customer/
 * @description Lista todos os clientes
 * @query offset, limit - Paginação
 * @access Private
 */
router.get('/', AsaasCustomerController.listAll);

/**
 * @route GET /asaas/customer/:groupName/cpfcnpj/:cpfCnpj
 * @description Busca cliente por CPF/CNPJ em um grupo específico
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @param {string} cpfCnpj - CPF ou CNPJ do cliente
 * @access Private
 */
router.get('/:groupName/cpfcnpj/:cpfCnpj', AsaasCustomerController.findByCpfCnpj);

/**
 * @route GET /asaas/customer/:groupName/external/:externalId
 * @description Busca cliente por referência externa (nuvemshop_id) em um grupo específico
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @param {string} externalId - ID externo (nuvemshop_id)
 * @access Private
 */
router.get('/:groupName/external/:externalId', AsaasCustomerController.findByExternalReference);

/**
 * @route DELETE /asaas/customer/:id
 * @description Remove um cliente no Asaas por ID
 * @param {string} id - ID do cliente no Asaas
 * @access Private
 */
router.delete('/:id', AsaasCustomerController.remove);

/**
 * @route GET /asaas/customer/:id
 * @description Busca cliente por ID no Asaas
 * @param {string} id - ID do cliente no Asaas
 * @access Private
 */
router.get('/:id', AsaasCustomerController.show);

module.exports = router;
