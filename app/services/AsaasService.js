require('dotenv').config();
const AsaasApiClient = require('../helpers/AsaasApiClient');
const AsaasValidator = require('../helpers/AsaasValidator');
const SellerService = require('./SellerService');
const { formatError } = require('../utils/errorHandler');

class AsaasService {
    async addCustomer(customerData) {
        try {
            AsaasValidator.validateCustomerData(customerData);

            // Verificar se o cliente já existe
            const params = new URLSearchParams();
            params.append('cpfCnpj', customerData.cpfCnpj);
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });

            if (items.totalCount === 0) {
                const created = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'customers',
                    data: customerData
                });
                return { success: true, data: created };
            } else {
                const error = new Error('Cliente já existe');
                error.name = 'CustomerExistsError';
                throw error;
            }
        } catch (error) {
            return formatError(error);
        }
    }

    async addSubAccount(accountData) {
        try {
            AsaasValidator.validateSubAccountData(accountData);

            const existingSeller = await SellerService.findByCpfCnpj(accountData.cpfCnpj);
            if (existingSeller && existingSeller.subaccount_id) {
                const error = new Error('Subconta já existe para este CPF/CNPJ');
                error.statusCode = 400;
                throw error;
            }

            const params = new URLSearchParams();
            params.append('cpfCnpj', accountData.cpfCnpj);
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts',
                params
            });

            let subAccountData;
            if (items.totalCount === 0) {
                subAccountData = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'accounts',
                    data: accountData
                });
            } else {
                subAccountData = items.data[0];
            }

            return subAccountData;
        } catch (error) {
            return formatError(error);
        }
    }

    async getAllSubAccounts() {
        try {
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts'
            });
            return items.totalCount > 0 ? items.data : [];
        } catch (error) {
            return formatError(error);
        }
    }

    async getSubAccountByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                throw new Error('CPF/CNPJ é obrigatório');
            }
            const params = new URLSearchParams();
            params.append('cpfCnpj', cpfCnpj);
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts',
                params
            });
            return items.totalCount > 0 ? items.data[0] : null;
        } catch (error) {
            return formatError(error);
        }
    }

    async getCustomers(filters) {
        try {
            const params = new URLSearchParams();
            for (const key of Object.keys(filters)) {
                if (filters[key]) params.append(key, filters[key]);
            }
            return await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });
        } catch (error) {
            return formatError(error);
        }
    }

    async registerWebhook(webhookData) {
        try {
            // Validate required fields
            if (!webhookData.url) {
                throw new Error('URL é obrigatória para o webhook');
            }

            // Ensure 'events' is provided as an array
            if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
                throw new Error('Pelo menos um evento deve ser especificado');
            }

            // Set defaults if not provided
            const webhook = {
                name: webhookData.name || 'Assinaturas App Webhook',
                url: webhookData.url,
                email: webhookData.email,
                enabled: webhookData.enabled !== undefined ? webhookData.enabled : true,
                interrupted: webhookData.interrupted !== undefined ? webhookData.interrupted : false,
                authToken: webhookData.authToken || null,
                sendType: webhookData.sendType || 'SEQUENTIALLY',
                events: webhookData.events
            };

            const created = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'webhooks',
                data: webhook
            });

            return { success: true, data: created };
        } catch (error) {
            return formatError(error);
        }
    }

    async getWebhooks() {
        try {
            const webhooks = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'webhooks'
            });
            return { success: true, data: webhooks };
        } catch (error) {
            return formatError(error);
        }
    }

    async getWebhookById(id) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }
            
            const webhook = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `webhooks/${id}`
            });
            
            return { success: true, data: webhook };
        } catch (error) {
            return formatError(error);
        }
    }

    async updateWebhook(id, webhookData) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `webhooks/${id}`,
                data: webhookData
            });

            return { success: true, data: updated };
        } catch (error) {
            return formatError(error);
        }
    }

    async deleteWebhook(id) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }

            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `webhooks/${id}`
            });

            return { success: true, message: 'Webhook excluído com sucesso' };
        } catch (error) {
            return formatError(error);
        }
    }

    async processWebhookEvent(eventData) {
        try {
            // Log the webhook event
            console.log('Webhook event received:', JSON.stringify(eventData));
            
            // Process the webhook event based on its type
            switch(eventData.event) {
                case 'PAYMENT_RECEIVED':
                case 'PAYMENT_CONFIRMED':
                    // Handle payment confirmation
                    console.log('Payment confirmed:', eventData.payment.id);
                    // Here you would implement business logic for confirmed payments
                    break;
                    
                case 'PAYMENT_OVERDUE':
                    // Handle overdue payments
                    console.log('Payment overdue:', eventData.payment.id);
                    // Here you would implement business logic for overdue payments
                    break;
                
                case 'PAYMENT_REFUNDED':
                    // Handle refunded payments
                    console.log('Payment refunded:', eventData.payment.id);
                    // Here you would implement business logic for refunded payments
                    break;
                
                default:
                    console.log('Unhandled event type:', eventData.event);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error processing webhook:', error);
            return formatError(error);
        }
    }
}

module.exports = new AsaasService();