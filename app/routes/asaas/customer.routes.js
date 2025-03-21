const express = require('express');
const router = express.Router();
const CustomerController = require('../../controllers/asaas/customer.controller');

/**
 * @route POST /asaas/customer/:groupName
 * @description Cria ou atualiza um cliente no Asaas no grupo especificado
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @access Private
 */
router.post('/:groupName', CustomerController.createOrUpdate);

/**
 * @route GET /asaas/customer/group/:groupName
 * @description Lista clientes por grupo (SELLERS ou SHOPPERS)
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @query offset, limit - Paginação
 * @access Private
 */
router.get('/group/:groupName', CustomerController.listByGroup);

/**
 * @route GET /asaas/customer/:groupName/cpfcnpj/:cpfCnpj
 * @description Busca cliente por CPF/CNPJ em um grupo específico
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @param {string} cpfCnpj - CPF ou CNPJ do cliente
 * @access Private
 */
router.get('/:groupName/cpfcnpj/:cpfCnpj', (req, res) => {
    // Incluir o groupName da URL nos query params para compatibilidade
    req.query.groupName = req.params.groupName;
    CustomerController.findByCpfCnpj(req, res);
});

/**
 * @route GET /asaas/customer/:groupName/external/:externalId
 * @description Busca cliente por referência externa (nuvemshop_id) em um grupo específico
 * @param {string} groupName - SELLERS ou SHOPPERS
 * @param {string} externalId - ID externo (nuvemshop_id)
 * @access Private
 */
router.get('/:groupName/external/:externalId', (req, res) => {
    // Incluir o groupName da URL nos query params para compatibilidade
    req.query.groupName = req.params.groupName;
    CustomerController.findByExternalReference(req, res);
});

/**
 * @route DELETE /asaas/customer/:id
 * @description Remove um cliente no Asaas por ID
 * @param {string} id - ID do cliente no Asaas
 * @access Private
 */
router.delete('/:id', CustomerController.remove);

module.exports = router;
