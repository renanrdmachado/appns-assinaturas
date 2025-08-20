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
            console.error('Erro ao criar webhook:', error.message, error.response?.data || '',
                error.nsError ? { status: error.nsError.status, body: error.nsError.originalError } : ''
            );
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
            console.error('Erro ao atualizar webhook:', error.message, error.response?.data || '',
                error.nsError ? { status: error.nsError.status, body: error.nsError.originalError } : ''
            );
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
            
            // Normalizar base URL para evitar duplicar /api
            const normalizeApiBase = (url) => {
                if (!url) return '';
                let b = url.trim();
                // remover barras finais
                b = b.replace(/\/+$/, '');
                // se já termina com /api (case-insensitive), manter; senão, acrescentar /api
                if (!/\/api$/i.test(b)) {
                    b = `${b}/api`;
                }
                return b;
            };

            const apiBase = normalizeApiBase(baseUrl);

            // URLs dos webhooks LGPD
            const webhooksToCreate = [
                {
                    event: 'store/redact',
                    url: `${apiBase}/ns/lgpd-webhooks/store/redact`
                },
                {
                    event: 'customers/redact', 
                    url: `${apiBase}/ns/lgpd-webhooks/customers/redact`
                },
                {
                    event: 'customers/data_request',
                    url: `${apiBase}/ns/lgpd-webhooks/customers/data-request`
                }
            ];

            // IMPORTANTE: Eventos LGPD (store/redact, customers/redact, customers/data_request)
            // NÃO são registráveis via endpoint /webhooks. Eles são gerenciados pela Nuvemshop
            // e devem ser configurados nas configurações do app no Partners Portal.
            // Por isso, não tentaremos criá-los via API aqui para evitar 422.

            console.log('Aviso: Eventos LGPD não são criados via API /webhooks. Use as URLs configuradas no Partners Portal.');
            console.log('Endpoints locais prontos para receber:', webhooksToCreate);

            console.log(`Configuração de webhooks LGPD concluída para loja ${storeId} (sem criação via API)`);

            return {
                success: true,
                message: 'LGPD gerenciado via Portal; endpoints locais prontos',
                data: webhooksToCreate
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
