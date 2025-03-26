require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError, createError } = require('../../utils/errorHandler');
const AsaasValidator = require('../../validators/asaas-validator');

class ShopperService {
    /**
     * Creates a subscription for a shopper
     * @param {Object} subscriptionData - Subscription data
     * @returns {Object} Created subscription or error
     */
    async createShopperSubscription(subscriptionData) {
        try {
            // Validar dados usando o validator
            if (!subscriptionData.customer) {
                return createError('ID do cliente (customer) é obrigatório', 400);
            }
            
            if (!subscriptionData.billingType) {
                return createError('Tipo de cobrança (billingType) é obrigatório', 400);
            }
            
            if (!subscriptionData.value) {
                return createError('Valor (value) é obrigatório', 400);
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
