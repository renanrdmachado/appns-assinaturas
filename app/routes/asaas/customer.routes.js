const express = require('express');
const router = express.Router();
const { addCustomer, getCustomers, updateCustomer } = require('../../controllers/asaas/customer.controller');

/**
 * @route POST /asaas/customer
 * @description Creates a new customer in Asaas payment platform
 * @access Private
 * @request_body {
 *   "name": "Customer name",
 *   "cpfCnpj": "CPF or CNPJ number",
 *   "email": "customer@email.com",
 *   "phone": "Phone number",
 *   "mobilePhone": "Mobile phone number",
 *   "postalCode": "Postal code",
 *   "groupName": "Mensalidade or Assinatura",
 *   "externalReference": "storeIDdaNuvemshop"
 * }
 * @response {
 *   "success": true,
 *   "data": {Customer object from Asaas}
 * }
 * @error {
 *   "success": false,
 *   "message": "Error message",
 *   "error": "Detailed error"
 * }
 * @flow Part of the SELLER onboarding process - creates the seller as a customer in Asaas
 */
router.post('/', addCustomer);

/**
 * @route GET /asaas/customer
 * @description Retrieves a paginated list of customers from Asaas, filtered by optional query params
 * @query offset, limit, name, email, cpfCnpj, groupName, externalReference
 * @access Private
 */
router.get('/', getCustomers);

/**
 * @route PUT /asaas/customer/:id
 * @description Updates an existing customer in Asaas
 * @access Private
 * @param {string} id - Customer ID in Asaas
 * @request_body {
 *   "name": "Updated customer name",
 *   "email": "updated@email.com",
 *   "phone": "Updated phone number",
 *   "mobilePhone": "Updated mobile phone",
 *   "postalCode": "Updated postal code"
 * }
 * @response {
 *   "success": true,
 *   "data": {Updated customer object}
 * }
 * @error {
 *   "success": false,
 *   "message": "Error message",
 *   "error": "Detailed error"
 * }
 */
router.put('/:id', updateCustomer);

module.exports = router;
