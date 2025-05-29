const NsApiClient = require('../../helpers/NsApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

class NsWebhooksService {
    
    /**
     * Lista todos os webhooks registrados para uma loja
     */
    async getWebhooks(storeId, accessToken, params = {}) {
        try {
            const result = await NsApiClient.get({
                storeId,
                endpoint: 'webhooks',
                accessToken,
                params
            });
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao buscar webhooks:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Busca um webhook específico por ID
     */
    async getWebhookById(storeId, accessToken, webhookId) {
        try {
            const result = await NsApiClient.get({
                storeId,
                endpoint: `webhooks/${webhookId}`,
                accessToken
            });
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao buscar webhook:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Cria um novo webhook
     */
    async createWebhook(storeId, accessToken, webhookData) {
        try {
            const result = await NsApiClient.post({
                storeId,
                endpoint: 'webhooks',
                accessToken,
                data: webhookData
            });
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao criar webhook:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Atualiza um webhook existente
     */
    async updateWebhook(storeId, accessToken, webhookId, webhookData) {
        try {
            const result = await NsApiClient.put({
                storeId,
                endpoint: `webhooks/${webhookId}`,
                accessToken,
                data: webhookData
            });
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao atualizar webhook:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Remove um webhook
     */
    async deleteWebhook(storeId, accessToken, webhookId) {
        try {
            const result = await NsApiClient.delete({
                storeId,
                endpoint: `webhooks/${webhookId}`,
                accessToken
            });
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao deletar webhook:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Configura todos os webhooks LGPD obrigatórios para uma loja
     */
    async setupLgpdWebhooks(storeId, accessToken, baseUrl) {
        try {
            console.log(`Configurando webhooks LGPD para loja ${storeId}`);
            
            // URLs dos webhooks LGPD
            const webhooksToCreate = [
                {
                    event: 'store/redact',
                    url: `${baseUrl}/api/ns/lgpd-webhooks/store/redact`
                },
                {
                    event: 'customers/redact', 
                    url: `${baseUrl}/api/ns/lgpd-webhooks/customers/redact`
                },
                {
                    event: 'customers/data_request',
                    url: `${baseUrl}/api/ns/lgpd-webhooks/customers/data-request`
                }
            ];
            
            const results = [];
            
            // Primeiro, buscar webhooks existentes
            const existingWebhooks = await this.getWebhooks(storeId, accessToken);
            
            if (existingWebhooks.success) {
                console.log(`Encontrados ${existingWebhooks.data.length} webhooks existentes`);
            }
            
            // Criar cada webhook LGPD
            for (const webhook of webhooksToCreate) {
                try {
                    // Verificar se já existe
                    const existing = existingWebhooks.success ? 
                        existingWebhooks.data.find(w => w.event === webhook.event) : null;
                    
                    if (existing) {
                        console.log(`Webhook ${webhook.event} já existe (ID: ${existing.id})`);
                        
                        // Atualizar URL se necessário
                        if (existing.url !== webhook.url) {
                            const updateResult = await this.updateWebhook(
                                storeId, 
                                accessToken, 
                                existing.id, 
                                webhook
                            );
                            
                            results.push({
                                event: webhook.event,
                                action: 'updated',
                                result: updateResult
                            });
                        } else {
                            results.push({
                                event: webhook.event,
                                action: 'already_exists',
                                webhook_id: existing.id
                            });
                        }
                    } else {
                        // Criar novo webhook
                        const createResult = await this.createWebhook(storeId, accessToken, webhook);
                        
                        results.push({
                            event: webhook.event,
                            action: 'created',
                            result: createResult
                        });
                    }
                } catch (webhookError) {
                    console.error(`Erro ao processar webhook ${webhook.event}:`, webhookError.message);
                    results.push({
                        event: webhook.event,
                        action: 'error',
                        error: webhookError.message
                    });
                }
            }
            
            console.log(`Configuração de webhooks LGPD concluída para loja ${storeId}`);
            
            return {
                success: true,
                message: 'Webhooks LGPD configurados',
                data: results
            };
            
        } catch (error) {
            console.error('Erro ao configurar webhooks LGPD:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Remove todos os webhooks LGPD de uma loja
     */
    async removeLgpdWebhooks(storeId, accessToken) {
        try {
            console.log(`Removendo webhooks LGPD da loja ${storeId}`);
            
            const lgpdEvents = ['store/redact', 'customers/redact', 'customers/data_request'];
            
            // Buscar webhooks existentes
            const existingWebhooks = await this.getWebhooks(storeId, accessToken);
            
            if (!existingWebhooks.success) {
                return existingWebhooks;
            }
            
            const results = [];
            
            // Remover webhooks LGPD
            for (const webhook of existingWebhooks.data) {
                if (lgpdEvents.includes(webhook.event)) {
                    try {
                        const deleteResult = await this.deleteWebhook(storeId, accessToken, webhook.id);
                        results.push({
                            event: webhook.event,
                            webhook_id: webhook.id,
                            action: 'deleted',
                            result: deleteResult
                        });
                    } catch (deleteError) {
                        results.push({
                            event: webhook.event,
                            webhook_id: webhook.id,
                            action: 'error',
                            error: deleteError.message
                        });
                    }
                }
            }
            
            return {
                success: true,
                message: 'Webhooks LGPD removidos',
                data: results
            };
            
        } catch (error) {
            console.error('Erro ao remover webhooks LGPD:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new NsWebhooksService();
