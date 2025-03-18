const express = require('express');
const router = express.Router();
const { createShopperSubscription } = require('../../controllers/asaas/shopper.controller');

/**
 * @route POST /asaas/shoppers/subscription
 * @description Creates a new subscription for a shopper
 * @access Private
 * @request_body {
 *   "customer": "Shopper customer ID in Asaas",
 *   "billingType": "Payment method (BOLETO, CREDIT_CARD, etc)",
 *   "value": Subscription value,
 *   "cycle": "MONTHLY",
 *   "dueDate": "YYYY-MM-DD",
 *   "description": "Subscription description or identifier",
 *   "tokenCreditCard": "Credit card token if applicable",
 *   "split": [
 *     {
 *       "walletId": "App wallet ID",
 *       "percentualValue": App commission percentage
 *     },
 *     {
 *       "walletId": "Seller wallet ID",
 *       "percentualValue": Seller commission percentage
 *     }
 *   ]
 * }
 * @response {
 *   "success": true,
 *   "data": {Subscription object from Asaas}
 * }
 * @error {
 *   "success": false,
 *   "message": "Error message",
 *   "error": "Detailed error"
 * }
 * @flow Part of the SHOPPER payment process - creates a subscription with payment split
 */
router.post('/subscription', createShopperSubscription);

module.exports = router;
