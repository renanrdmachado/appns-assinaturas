const express = require('express');
const router = express.Router();
const { 
    addSubAccount, 
    getAllSubAccounts, 
    getSubAccountByCpfCnpj 
} = require('../../controllers/asaas/subaccount.controller');

/**
 * @route POST /asaas/subaccount
 * @description Creates a sub-account in Asaas to enable split payments
 * @access Private
 * @request_body {
 *   "name": "Seller name",
 *   "email": "seller@email.com",
 *   "loginEmail": "seller.login@email.com",
 *   "cpfCnpj": "CPF or CNPJ number",
 *   "birthDate": "YYYY-MM-DD",
 *   "mobilePhone": "Mobile phone number",
 *   "site": "https://sellersite.com",
 *   "incomeValue": 25000,
 *   "address": "Seller address",
 *   "addressNumber": "Address number",
 *   "province": "Province/District",
 *   "postalCode": "Postal code"
 * }
 * @response {
 *   Account object from Asaas
 * }
 * @error {
 *   "success": false,
 *   "message": "Error message",
 *   "error": "Detailed error"
 * }
 * @flow Part of the SELLER onboarding process - creates a sub-account that will receive split payments from customer subscriptions
 */
router.post('/', addSubAccount);

/**
 * @route GET /asaas/subaccount
 * @description Retrieves all sub-accounts registered in Asaas
 * @access Private - Admin only
 * @response Array of sub-account objects
 * @error {
 *   "error": "Error message"
 * }
 * @flow Administrative function for monitoring all registered sub-accounts
 */
router.get('/', getAllSubAccounts);

/**
 * @route GET /asaas/subaccount/bycpfcnpj/:cpfCnpj
 * @description Retrieves a specific sub-account by CPF/CNPJ
 * @param {string} cpfCnpj - CPF or CNPJ number to search for
 * @access Private
 * @response Sub-account object if found, null if not found
 * @error {
 *   "error": "Error message"
 * }
 * @flow Used to verify if a seller already has a sub-account before creating a new one
 */
router.get('/bycpfcnpj/:cpfCnpj', getSubAccountByCpfCnpj);

module.exports = router;
