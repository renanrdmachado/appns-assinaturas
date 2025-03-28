require('dotenv').config();
const customerService = require('./asaas/customer.service');
const subAccountService = require('./asaas/subaccount.service');
const webhookService = require('./asaas/webhook.service');
const subscriptionService = require('./asaas/subscription.service');

class AsaasService {
    // Métodos principais do serviço Asaas
    
    // Delegando para os serviços específicos
    
    // Clientes
    async createOrUpdateCustomer(groupName, customerData) {
        return await customerService.createOrUpdate(groupName, customerData);
    }
    
    async getCustomerById(id) {
        return await customerService.getById(id);
    }
    
    async listCustomersByGroup(groupName, params = {}) {
        return await customerService.listByGroup(groupName, params);
    }
    
    async findCustomerByCpfCnpj(groupName, cpfCnpj) {
        return await customerService.findByCpfCnpj(groupName, cpfCnpj);
    }
    
    async findCustomerByExternalId(groupName, externalId) {
        return await customerService.findByExternalId(groupName, externalId);
    }
    
    async removeCustomer(id) {
        return await customerService.remove(id);
    }
    
    // Subcontas
    async addSubAccount(accountData) {
        return await subAccountService.addSubAccount(accountData);
    }
    
    async getAllSubAccounts() {
        return await subAccountService.getAllSubAccounts();
    }
    
    async getSubAccountByCpfCnpj(cpfCnpj) {
        return await subAccountService.getSubAccountByCpfCnpj(cpfCnpj);
    }
    
    // Assinaturas
    async createSubscription(subscriptionData) {
        return await subscriptionService.create(subscriptionData);
    }
    
    async getSubscription(id) {
        return await subscriptionService.get(id);
    }
    
    async getAllSubscriptions(filters = {}) {
        return await subscriptionService.getAll(filters);
    }
    
    async updateSubscription(id, subscriptionData) {
        return await subscriptionService.update(id, subscriptionData);
    }
    
    async deleteSubscription(id) {
        return await subscriptionService.delete(id);
    }
    
    async getSubscriptionsByCustomerId(customerId) {
        return await subscriptionService.getByCustomerId(customerId);
    }
    
    // Webhooks
    async registerWebhook(webhookData) {
        return await webhookService.registerWebhook(webhookData);
    }
    
    async getWebhooks() {
        return await webhookService.getWebhooks();
    }
    
    async getWebhookById(id) {
        return await webhookService.getWebhookById(id);
    }
    
    async updateWebhook(id, webhookData) {
        return await webhookService.updateWebhook(id, webhookData);
    }
    
    async deleteWebhook(id) {
        return await webhookService.deleteWebhook(id);
    }
    
    async processWebhookEvent(eventData) {
        return await webhookService.processWebhookEvent(eventData);
    }
}

module.exports = new AsaasService();
