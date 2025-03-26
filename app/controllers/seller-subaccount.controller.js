const SellerSubAccountService = require('../services/seller-subaccount.service');
const { formatError } = require('../utils/errorHandler');

class SellerSubAccountController {
    /**
     * Lista todas as subcontas de vendedores
     */
    async index(req, res) {
        try {
            const result = await SellerSubAccountService.getAll();
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao listar subcontas de vendedores:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca a subconta de um vendedor específico
     */
    async show(req, res) {
        try {
            const { seller_id } = req.params;
            
            const result = await SellerSubAccountService.getBySellerId(seller_id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar subconta do vendedor ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Cria uma subconta para um vendedor
     */
    async store(req, res) {
        try {
            const { seller_id } = req.params;
            const subAccountData = req.body;
            
            const result = await SellerSubAccountService.create(seller_id, subAccountData);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json({
                success: true,
                message: 'Subconta do vendedor criada com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao criar subconta para vendedor:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new SellerSubAccountController();
