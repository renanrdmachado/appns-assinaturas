const customerService = require('./customer.service');
const subAccountService = require('./subaccount.service');
const webhookService = require('./webhook.service');
const shopperService = require('./shopper.service');

module.exports = {
    ...customerService,
    ...subAccountService,
    ...webhookService,
    ...shopperService
};
