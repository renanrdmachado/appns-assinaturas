require('dotenv').config();
const AsaasService = require('../../services/asaas/subaccount.service');
const { formatError, createError } = require('../../utils/errorHandler');

class AsaasSubaccountController {
    async create(req, res) {
        try {
            const account = req.body;
            
            const result = await AsaasService.addSubAccount(account);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            // Retorna diretamente o resultado sem aninhamento extra
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao adicionar subconta:', error);
            return res.status(500).json(formatError(error));
        }
    }

    async list(req, res) {
        try {
            const result = await AsaasService.getAllSubAccounts();
            
            // Verificar se a operação foi bem-sucedida e evitar aninhamento desnecessário
            if (!result) {
                return res.status(400).json(createError('Erro ao buscar subcontas', 400));
            }
            
            // Se o resultado já tiver o formato { success, data }, retorna diretamente
            if (result.success && result.data) {
                return res.json(result);
            }
            
            // Caso contrário, formata a resposta adequadamente
            return res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Erro ao listar subcontas:', error);
            return res.status(500).json(formatError(error));
        }
    }

    async findByCpfCnpj(req, res) {
        try {
            const { cpfCnpj } = req.params;
            if (!cpfCnpj) {
                return res.status(400).json(createError('CPF/CNPJ é obrigatório', 400));
            }
            
            const result = await AsaasService.getSubAccountByCpfCnpj(cpfCnpj);
            
            // Verificar se a operação foi bem-sucedida
            if (!result) {
                return res.status(404).json(createError('Subconta não encontrada para o CPF/CNPJ informado', 404));
            }
            
            // Se o resultado já tiver o formato { success, data }, retorna diretamente
            if (result.success && result.data) {
                return res.json(result);
            }
            
            // Caso contrário, formata a resposta adequadamente
            return res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Erro ao buscar subconta por CPF/CNPJ:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new AsaasSubaccountController();
