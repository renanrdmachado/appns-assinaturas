require('dotenv').config();
const AsaasService = require('../../services/asaas/webhook.service');

const registerWebhook = async (req, res) => {
    try {
        const webhookData = req.body;
        const result = await AsaasService.registerWebhook(webhookData);
        
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Erro ao registrar webhook:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar webhook',
            error: error.message
        });
    }
};

const getWebhooks = async (req, res) => {
    try {
        const result = await AsaasService.getWebhooks();
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar webhooks:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar webhooks',
            error: error.message
        });
    }
};

const updateWebhook = async (req, res) => {
    try {
        const { id } = req.params;
        const webhookData = req.body;
        
        const result = await AsaasService.updateWebhook(id, webhookData);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao atualizar webhook:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar webhook',
            error: error.message
        });
    }
};

const deleteWebhook = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AsaasService.deleteWebhook(id);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao excluir webhook:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir webhook',
            error: error.message
        });
    }
};

const receiveWebhook = async (req, res) => {
    console.log('Webhook received');
    try {
        const eventData = req.body;
        console.log('Webhook received:', JSON.stringify(eventData, null, 2)); // Improved logging
        
        // Process webhook normally
        const result = await AsaasService.processWebhookEvent(eventData);
        
        // Always return 200 OK to Asaas to acknowledge receipt
        res.status(200).json({ 
            success: true, 
            message: 'Webhook processed successfully'
        });
    } catch (error) {
        console.error('Erro ao processar evento de webhook:', error.message);
        // Still return 200 to prevent Asaas from retrying
        res.status(200).json({ 
            success: false, 
            message: 'Erro ao processar evento de webhook',
            error: error.message 
        });
    }
};

const getWebhookById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID do webhook é obrigatório'
            });
        }
        
        const result = await AsaasService.getWebhookById(id);
        
        if (result && result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json({
                success: false,
                message: 'Webhook não encontrado'
            });
        }
    } catch (error) {
        console.error('Erro ao buscar webhook por ID:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar webhook por ID',
            error: error.message
        });
    }
};

module.exports = {
    registerWebhook,
    getWebhooks,
    updateWebhook,
    deleteWebhook,
    receiveWebhook,
    getWebhookById
};
