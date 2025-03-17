require('dotenv').config();
const AsaasService = require('../services/AsaasService');

const addCustomer = async (req, res) => {
    try {
        const customer = req.body;
        const result = await AsaasService.addCustomer(customer);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao adicionar cliente', 
            error: error.message 
        });
    }
};

const addSubAccount = async (req, res) => {
    try {
        const account = req.body;
        
        const result = await AsaasService.addSubAccount(account);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao adicionar subconta:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao adicionar subconta', 
            error: error.message 
        });
    }
};

const getSubAccount = async (req, res) => {
    try {
        const { cpfCnpj } = req.query;
        console.log('cpfCnpj:', cpfCnpj);
        const result = await AsaasService.getSubAccount(cpfCnpj);
        
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Nenhuma subconta encontrada' 
            });
        }
    } catch (error) {
        console.error('Erro ao buscar subconta:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar subconta', 
            error: error.message 
        });
    }
};

// Get all sub-accounts
const getAllSubAccounts = async (req, res) => {
    try {
        const result = await AsaasService.getAllSubAccounts();
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get a specific sub-account by CPF/CNPJ
const getSubAccountByCpfCnpj = async (req, res) => {
    try {
        const { cpfCnpj } = req.params;
        if (!cpfCnpj) {
            return res.status(400).json({ error: 'CPF/CNPJ is required' });
        }
        
        const result = await AsaasService.getSubAccountByCpfCnpj(cpfCnpj);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getCustomers = async (req, res) => {
    try {
        const filters = req.query; // { offset, limit, name, email, cpfCnpj, groupName, externalReference }
        const result = await AsaasService.getCustomers(filters);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar clientes Asaas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar clientes Asaas',
            error: error.message
        });
    }
};

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
    try {
        const eventData = req.body;
        console.log('Webhook received:', JSON.stringify(eventData, null, 2)); // Improved logging
        await AsaasService.processWebhookEvent(eventData);
        // Always return 200 OK to Asaas to acknowledge receipt
        res.status(200).json({ success: true });
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

// Adicione esta função ao controller existente
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
    addCustomer,
    addSubAccount,
    getSubAccount,
    getAllSubAccounts,
    getSubAccountByCpfCnpj,
    getCustomers,
    registerWebhook,
    getWebhooks,
    updateWebhook,
    deleteWebhook,
    receiveWebhook,
    getWebhookById
};