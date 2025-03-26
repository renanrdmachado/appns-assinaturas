require('dotenv').config();
const AsaasService = require('../../services/asaas/subaccount.service');
const { formatError } = require('../../utils/errorHandler');

const addSubAccount = async (req, res) => {
    try {
        const account = req.body;
        
        const result = await AsaasService.addSubAccount(account);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao adicionar subconta:', error);
        res.status(500).json(formatError(error));
    }
};

const getSubAccount = async (req, res) => {
    try {
        const { cpfCnpj } = req.query;
        console.log('cpfCnpj:', cpfCnpj);
        const result = await AsaasService.getSubAccount(cpfCnpj);
        
        // Verificar se a operação foi bem-sucedida
        if (!result || (typeof result === 'object' && !result.success)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nenhuma subconta encontrada' 
            });
        }
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erro ao buscar subconta:', error.message);
        res.status(500).json(formatError(error));
    }
};

// Get all sub-accounts
const getAllSubAccounts = async (req, res) => {
    try {
        const result = await AsaasService.getAllSubAccounts();
        
        // Verificar se a operação foi bem-sucedida
        if (!result || (typeof result === 'object' && !result.success)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Erro ao buscar subcontas',
                error: result.message || 'Erro desconhecido' 
            });
        }
        
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erro ao listar subcontas:', error);
        return res.status(500).json(formatError(error));
    }
};

// Get a specific sub-account by CPF/CNPJ
const getSubAccountByCpfCnpj = async (req, res) => {
    try {
        const { cpfCnpj } = req.params;
        if (!cpfCnpj) {
            return res.status(400).json({ 
                success: false, 
                message: 'CPF/CNPJ é obrigatório'
            });
        }
        
        const result = await AsaasService.getSubAccountByCpfCnpj(cpfCnpj);
        
        // Verificar se a operação foi bem-sucedida
        if (!result || (typeof result === 'object' && !result.success)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Subconta não encontrada para o CPF/CNPJ informado'
            });
        }
        
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erro ao buscar subconta por CPF/CNPJ:', error);
        return res.status(500).json(formatError(error));
    }
};

module.exports = {
    addSubAccount,
    getSubAccount,
    getAllSubAccounts,
    getSubAccountByCpfCnpj
};
