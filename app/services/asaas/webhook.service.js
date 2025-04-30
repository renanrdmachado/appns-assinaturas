require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError, createError } = require('../../utils/errorHandler');
const EventHandlerFactory = require('./handlers/event-handler-factory');

class WebhookService {
    async registerWebhook(webhookData) {
        try {
            // Validar dados do webhook
            if (!webhookData.url) {
                return createError('URL é obrigatória para o webhook', 400);
            }

            // Garantir que 'events' seja fornecido como um array
            if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
                return createError('Pelo menos um evento deve ser especificado', 400);
            }

            // Definir valores padrão se não forem fornecidos
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
            console.error('Erro ao registrar webhook:', error);
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
            console.error('Erro ao listar webhooks:', error);
            return formatError(error);
        }
    }

    async getWebhookById(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }
            
            const webhook = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `webhooks/${id}`
            });
            
            return { success: true, data: webhook };
        } catch (error) {
            console.error(`Erro ao buscar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async updateWebhook(id, webhookData) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `webhooks/${id}`,
                data: webhookData
            });

            return { success: true, data: updated };
        } catch (error) {
            console.error(`Erro ao atualizar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async deleteWebhook(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `webhooks/${id}`
            });

            return { success: true, message: 'Webhook excluído com sucesso' };
        } catch (error) {
            console.error(`Erro ao excluir webhook ${id}:`, error);
            return formatError(error);
        }
    }

    /**
     * Processa eventos recebidos pelo webhook
     * @param {Object} eventData - Dados do evento recebido
     * @returns {Promise<Object>} - Resultado do processamento
     */
    async processWebhookEvent(eventData) {
        try {
            // Registrar o recebimento do evento
            console.log('Webhook event received:', JSON.stringify(eventData));
            
            // Validar dados do evento
            if (!eventData.event) {
                return createError('Dados de webhook inválidos: Informação de evento ausente', 400);
            }
            
            // Usar o EventHandlerFactory para processar o evento
            const result = await EventHandlerFactory.processEvent(eventData);
            
            if (!result.success) {
                console.warn('Erro processando webhook:', result.message);
                // Sempre retorna OK para evitar que o Asaas faça novas tentativas
                return { 
                    success: false, 
                    message: result.message,
                    processed: false,
                    event: eventData.event
                };
            }
            
            return {
                success: true,
                message: result.message || 'Webhook processado com sucesso',
                processed: true,
                event: result.event || eventData.event,
                entity: result.entity,
                status: result.status
            };
        } catch (error) {
            console.error('Erro ao processar evento de webhook:', error);
            // Ainda retorna 200 para prevenir que o Asaas tente novamente
            return {
                success: false,
                message: error.message || 'Erro interno ao processar webhook',
                processed: false,
                event: eventData.event
            };
        }
    }

    /**
     * Retorna a lista de eventos suportados pelo webhook
     * @returns {string[]} - Lista de eventos suportados
     */
    getSupportedEvents() {
        // Usando nossa fábrica para listar os eventos suportados
        return EventHandlerFactory.getSupportedEvents();
    }
}

module.exports = new WebhookService();
