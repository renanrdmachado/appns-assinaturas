require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError } = require('../../utils/errorHandler');

class ShopperService {
    /**
     * Creates a subscription for a shopper
     * @param {Object} subscriptionData - Subscription data
     * @returns {Object} Created subscription or error
     */
    async createShopperSubscription(subscriptionData) {
        try {
            // Validate required fields
            if (!subscriptionData.customer || !subscriptionData.billingType || !subscriptionData.value) {
                throw new Error('Missing required fields: customer, billingType, or value');
            }

            // Set default cycle to MONTHLY if not specified
            if (!subscriptionData.cycle) {
                subscriptionData.cycle = 'MONTHLY';
            }

            // Create subscription through Asaas API
            const subscription = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'subscriptions',
                data: subscriptionData
            });

            return { success: true, data: subscription };
        } catch (error) {
            return formatError(error);
        }
    }
}

module.exports = new ShopperService();
