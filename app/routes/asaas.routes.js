const express = require('express');
const router = express.Router();
const {
    addCustomer,
    addSubAccount,
    getAllSubAccounts,
    getSubAccountByCpfCnpj,
    getCustomers,
    registerWebhook,
    getWebhooks,
    getWebhookById,
    updateWebhook,
    deleteWebhook,
    receiveWebhook,
    testWebhook
    // Additional controller methods would be imported here
} = require('../controllers/AsaasController');

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
router.post('/customer', addCustomer);

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
router.post('/subaccount', addSubAccount);

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
router.get('/subaccount', getAllSubAccounts);

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
router.get('/subaccount/bycpfcnpj/:cpfCnpj', getSubAccountByCpfCnpj);

/**
 * @route GET /asaas/customers
 * @description Retrieves a paginated list of customers from Asaas, filtered by optional query params
 * @query offset, limit, name, email, cpfCnpj, groupName, externalReference
 * @access Private
 */
router.get('/customers', getCustomers);

/**
 * @route POST /asaas/subscription
 * @description Creates a new subscription in Asaas for a customer
 * @access Private
 * @request_body {
 *   "customer": "Customer ID in Asaas",
 *   "billingType": "Payment method (BOLETO, CREDIT_CARD, etc)",
 *   "value": Subscription value,
 *   "cycle": "MONTHLY",
 *   "dueDate": "YYYY-MM-DD",
 *   "description": "Subscription description or identifier (usually seller_id)",
 *   "split": [
 *     {
 *       "walletId": "App wallet ID",
 *       "percentualValue": App commission percentage (3%)
 *     },
 *     {
 *       "walletId": "Seller wallet ID",
 *       "percentualValue": Seller commission percentage (97%)
 *     }
 *   ]
 * }
 * @response Subscription object from Asaas
 * @error {
 *   "success": false,
 *   "message": "Error message"
 * }
 * @flow Part of the CUSTOMER purchase process - creates the subscription with payment split
 */
// router.post('/subscription', createSubscription);

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
router.post('/webhook/register', registerWebhook);

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
router.get('/webhook', getWebhooks);

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
router.get('/webhook/:id', getWebhookById);

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
router.put('/webhook/:id', updateWebhook);

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
router.delete('/webhook/:id', deleteWebhook);

/**
 * @route POST /asaas/webhook/receive
 * @description Endpoint that receives webhook notifications from Asaas
 * @access Public (with authentication from Asaas)
 * @request_body Webhook payload from Asaas
 * @response {
 *   "success": true
 * }
 * @flow Payment processing - handles payment status updates from Asaas
 */
router.post('/webhook/receive', receiveWebhook);

module.exports = router;