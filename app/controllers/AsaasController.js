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
        const sellerId = req.params.id;
        
        const result = await AsaasService.addSubAccount(account, sellerId);
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

module.exports = {
    addCustomer,
    addSubAccount,
    getSubAccount,
    getAllSubAccounts,
    getSubAccountByCpfCnpj,
    getCustomers
};