const NsWebhooksService = require('../../services/ns/webhooks.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class WebhooksController {
    
    /**
     * Lista webhooks de uma loja
     */
    async getWebhooks(req, res) {
        try {
            const { seller_id } = req.params;
            const { since_id, url, event, page, per_page } = req.query;
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.getWebhooks(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                { since_id, url, event, page, per_page }
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao buscar webhooks:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca webhook específico
     */
    async getWebhookById(req, res) {
        try {
            const { seller_id, webhook_id } = req.params;
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.getWebhookById(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                webhook_id
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao buscar webhook:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Cria novo webhook
     */
    async createWebhook(req, res) {
        try {
            const { seller_id } = req.params;
            const { event, url } = req.body;
            
            if (!event || !url) {
                return res.status(400).json({
                    success: false,
                    message: 'event e url são obrigatórios'
                });
            }
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.createWebhook(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                { event, url }
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.status(201).json({
                success: true,
                message: 'Webhook criado com sucesso',
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao criar webhook:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Configura webhooks LGPD automaticamente
     */
    async setupLgpdWebhooks(req, res) {
        try {
            const { seller_id } = req.params;
            const { base_url } = req.body;
            
            if (!base_url) {
                return res.status(400).json({
                    success: false,
                    message: 'base_url é obrigatório (ex: https://meuapp.com)'
                });
            }
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.setupLgpdWebhooks(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                base_url
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhooks LGPD configurados com sucesso',
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao configurar webhooks LGPD:', error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Configura webhooks padrão (ex.: order/paid) via API para a loja
     */
    async setupDefaultWebhooks(req, res) {
        try {
            const { seller_id } = req.params;
            const { base_url } = req.body;

            if (!base_url) {
                return res.status(400).json({
                    success: false,
                    message: 'base_url é obrigatório (ex: https://meuapp.com ou https://meuapp.com/api)'
                });
            }

            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }

            const seller = sellerResult.data;

            const result = await NsWebhooksService.setupDefaultWebhooks(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                base_url
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: 'Webhooks padrão configurados',
                data: result.data
            });

        } catch (error) {
            console.error('Erro ao configurar webhooks padrão:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Remove webhooks LGPD
     */
    async removeLgpdWebhooks(req, res) {
        try {
            const { seller_id } = req.params;
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.removeLgpdWebhooks(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhooks LGPD removidos com sucesso',
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao remover webhooks LGPD:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Atualiza webhook existente
     */
    async updateWebhook(req, res) {
        try {
            const { seller_id, webhook_id } = req.params;
            const { event, url } = req.body;
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.updateWebhook(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                webhook_id,
                { event, url }
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhook atualizado com sucesso',
                data: result.data
            });
            
        } catch (error) {
            console.error('Erro ao atualizar webhook:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Remove webhook
     */
    async deleteWebhook(req, res) {
        try {
            const { seller_id, webhook_id } = req.params;
            
            // Buscar informações do seller
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(404).json(sellerResult);
            }
            
            const seller = sellerResult.data;
            
            const result = await NsWebhooksService.deleteWebhook(
                seller.nuvemshop_id,
                seller.nuvemshop_api_token,
                webhook_id
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhook removido com sucesso'
            });
            
        } catch (error) {
            console.error('Erro ao remover webhook:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new WebhooksController();
