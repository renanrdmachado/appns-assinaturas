const customerController = require('./customer.controller');
const subAccountController = require('./subaccount.controller');
const webhookController = require('./webhook.controller');
const shopperController = require('./shopper.controller');

module.exports = {
    ...customerController,
    ...subAccountController,
    ...webhookController,
    ...shopperController
};
