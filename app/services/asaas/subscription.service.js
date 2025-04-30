const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError, createError } = require('../../utils/errorHandler');
const SubscriptionValidator = require('../../validators/subscription-validator');
const SellerSubscriptionService = require('../seller-subscription.service');
const ShopperSubscriptionService = require('../shopper-subscription.service');

class SubscriptionService {
    /**
     * Cria uma assinatura no Asaas
     * @param {Object} data - Dados da assinatura
     * @returns {Object} - Resultado da operação
     */
    async create(data) {
        try {
            // Validar dados
            try {
                SubscriptionValidator.validateSubscriptionData(data);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            // Definir valor padrão para o ciclo se não for fornecido
            if (!data.cycle) {
                data.cycle = 'MONTHLY';
            }
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'subscriptions',
                data: data
            });
            
            return { 
                success: true, 
                data: response,
                message: 'Assinatura criada com sucesso'
            };
        } catch (error) {
            console.error('Erro ao criar assinatura no Asaas:', error);
            return formatError(error);
        }
    }
    
    /**
     * Atualiza uma assinatura no Asaas
     * @param {string} id - ID da assinatura
     * @param {Object} data - Dados para atualização
     * @returns {Object} - Resultado da operação
     */
    async update(id, data) {
        try {
            if (!id) {
                return createError('ID da assinatura é obrigatório', 400);
            }
            
            // Validar dados
            try {
                SubscriptionValidator.validateSubscriptionUpdateData(data);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `subscriptions/${id}`,
                data: data
            });
            
            return { 
                success: true, 
                data: response,
                message: 'Assinatura atualizada com sucesso'
            };
        } catch (error) {
            console.error(`Erro ao atualizar assinatura ID ${id} no Asaas:`, error);
            return formatError(error);
        }
    }
    
    /**
     * Obtém uma assinatura específica do Asaas
     * @param {string} id - ID da assinatura
     * @returns {Object} - Resultado da operação
     */
    async get(id) {
        try {
            if (!id) {
                return createError('ID da assinatura é obrigatório', 400);
            }
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `subscriptions/${id}`
            });
            
            return { 
                success: true, 
                data: response
            };
        } catch (error) {
            console.error(`Erro ao buscar assinatura ID ${id} no Asaas:`, error);
            return formatError(error);
        }
    }
    
    /**
     * Lista todas as assinaturas do Asaas
     * @param {Object} filters - Filtros para a listagem
     * @returns {Object} - Resultado da operação
     */
    async getAll(filters = {}) {
        try {
            // Converter filtros para URLSearchParams
            const params = new URLSearchParams();
            
            // Adicionar filtros se existirem
            if (filters.customer) params.append('customer', filters.customer);
            if (filters.billingType) params.append('billingType', filters.billingType);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.limit) params.append('limit', filters.limit);
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'subscriptions',
                params: params
            });
            
            return { 
                success: true, 
                data: response
            };
        } catch (error) {
            console.error('Erro ao listar assinaturas no Asaas:', error);
            return formatError(error);
        }
    }
    
    /**
     * Lista assinaturas por cliente no Asaas
     * @param {string} customerId - ID do cliente 
     * @returns {Object} - Resultado da operação
     */
    async getByCustomerId(customerId) {
        try {
            if (!customerId) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            // Criar filtro para customer
            const params = new URLSearchParams();
            params.append('customer', customerId);
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'subscriptions',
                params: params
            });
            
            return { 
                success: true, 
                data: response
            };
        } catch (error) {
            console.error(`Erro ao listar assinaturas para o cliente ID ${customerId} no Asaas:`, error);
            return formatError(error);
        }
    }
    
    /**
     * Lista assinaturas por referência externa no Asaas
     * @param {string} externalReference - Referência externa
     * @returns {Object} - Resultado da operação
     */
    async getByExternalReference(externalReference) {
        try {
            if (!externalReference) {
                return createError('Referência externa é obrigatória', 400);
            }
            
            // Criar filtro para externalReference
            const params = new URLSearchParams();
            params.append('externalReference', externalReference);
            
            // Enviar solicitação para a API do Asaas
            const response = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'subscriptions',
                params: params
            });
            
            return { 
                success: true, 
                data: response
            };
        } catch (error) {
            console.error(`Erro ao listar assinaturas para referência externa ${externalReference} no Asaas:`, error);
            return formatError(error);
        }
    }
    
    /**
     * Deleta uma assinatura no Asaas (na verdade, apenas a cancela)
     * @param {string} id - ID da assinatura
     * @returns {Object} - Resultado da operação
     */
    async delete(id) {
        try {
            if (!id) {
                return createError('ID da assinatura é obrigatório', 400);
            }
            
            // Na verdade, estamos apenas cancelando a assinatura no Asaas
            // O soft delete será aplicado pelo webhook SUBSCRIPTION_DELETED
            console.log(`Cancelando (não excluindo) assinatura ${id} no Asaas`);
            
            // Verificar se é uma assinatura de vendedor
            const sellerSubResult = await SellerSubscriptionService.getByExternalId(id);
            if (sellerSubResult.success && sellerSubResult.data) {
                // Atualiza status para 'canceled' e define a data de término
                await SellerSubscriptionService.update(sellerSubResult.data.id, {
                    status: 'canceled',
                    end_date: new Date()
                });
                
                console.log(`Assinatura de vendedor ID ${sellerSubResult.data.id} marcada como cancelada`);
            }
            
            // Verificar se é uma assinatura de comprador
            const shopperSubResult = await ShopperSubscriptionService.getByExternalId(id);
            if (shopperSubResult.success && shopperSubResult.data) {
                // Atualiza status para 'canceled' e define a data de término
                await ShopperSubscriptionService.update(shopperSubResult.data.id, {
                    status: 'canceled',
                    end_date: new Date()
                });
                
                console.log(`Assinatura de comprador ID ${shopperSubResult.data.id} marcada como cancelada`);
            }
            
            // Enviar solicitação de cancelamento para a API do Asaas
            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `subscriptions/${id}`
            });
            
            return { 
                success: true, 
                message: 'Assinatura cancelada com sucesso'
            };
        } catch (error) {
            console.error(`Erro ao cancelar assinatura ID ${id} no Asaas:`, error);
            return formatError(error);
        }
    }
}

module.exports = new SubscriptionService();
