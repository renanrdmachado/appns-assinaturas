require('dotenv').config();
const AsaasWebhookService = require('../../services/asaas/webhook.service');
const { formatError, createError } = require('../../utils/errorHandler');

class AsaasWebhookController {
    async register(req, res) {
        try {
            const webhookData = req.body;
            const result = await AsaasWebhookService.registerWebhook(webhookData);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json({
                success: true,
                message: 'Webhook registrado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao registrar webhook:', error);
            return res.status(500).json(formatError(error));
        }
    }

    async list(req, res) {
        try {
            const result = await AsaasWebhookService.getWebhooks();
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
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

    async getById(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID do webhook é obrigatório', 400));
            }
            
            const result = await AsaasWebhookService.getWebhookById(id);
            
            if (!result.success) {
                return res.status(result.status || 404).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar webhook ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const webhookData = req.body;
            
            if (!id) {
                return res.status(400).json(createError('ID do webhook é obrigatório', 400));
            }
            
            const result = await AsaasWebhookService.updateWebhook(id, webhookData);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhook atualizado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao atualizar webhook ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID do webhook é obrigatório', 400));
            }
            
            const result = await AsaasWebhookService.deleteWebhook(id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Webhook removido com sucesso'
            });
        } catch (error) {
            console.error(`Erro ao remover webhook ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    async receive(req, res) {
        try {
            const eventData = req.body;
            console.log('Webhook recebido:', JSON.stringify(eventData, null, 2));
            
            // Processar o webhook
            const result = await AsaasWebhookService.processWebhookEvent(eventData);
            
            // Sempre retorna 200 OK para o Asaas, mesmo em caso de erro
            // para evitar que o Asaas faça novas tentativas
            if (!result.success) {
                console.warn('Erro processando webhook:', result.message);
                return res.status(200).json({ 
                    success: false, 
                    message: result.message,
                    processed: false,
                    paymentId: eventData.payment?.id,
                    event: eventData.event
                });
            }
            
            return res.status(200).json({
                success: true,
                message: result.message || 'Webhook processado com sucesso',
                processed: true,
                paymentId: result.paymentId,
                event: result.event,
                entity: result.entity,
                status: result.status
            });
        } catch (error) {
            console.error('Erro ao processar evento de webhook:', error);
            // Ainda retorna 200 para prevenir que o Asaas tente novamente
            return res.status(200).json({
                success: false,
                message: error.message || 'Erro interno ao processar webhook',
                processed: false,
                paymentId: req.body.payment?.id,
                event: req.body.event
            });
        }
    }
}

module.exports = new AsaasWebhookController();
