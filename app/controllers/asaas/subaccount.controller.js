require('dotenv').config();
const AsaasService = require('../../services/asaas/subaccount.service');

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

module.exports = {
    addSubAccount,
    getSubAccount,
    getAllSubAccounts,
    getSubAccountByCpfCnpj
};
