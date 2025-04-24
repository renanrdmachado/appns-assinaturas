const ShopperService = require('../services/shopper.service');
const { formatError } = require('../utils/errorHandler');

class ShopperController {
    /**
     * Lista todos os shoppers
     */
    async index(req, res) {
        try {
            const result = await ShopperService.getAll();
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao listar shoppers:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca um shopper específico
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            
            const result = await ShopperService.get(id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar shopper ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca um shopper por ID da Nuvemshop
     */
    async showByNuvemshopId(req, res) {
        try {
            const { nuvemshopId } = req.params;
            
            const result = await ShopperService.getByNuvemshopId(nuvemshopId);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar shopper por Nuvemshop ID ${req.params.nuvemshopId}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Cria um novo shopper
     */
    async store(req, res) {
        try {
            const shopperData = req.body;
            
            const result = await ShopperService.create(shopperData);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            // Caso especial: cliente já existe no Asaas e está vinculado a um shopper
            if (result.alreadyExists) {
                return res.status(200).json({
                    success: true,
                    alreadyExists: true,
                    message: result.message || 'Shopper já existente recuperado com sucesso',
                    data: result.data
                });
            }
            
            return res.status(201).json({
                success: true,
                message: 'Shopper criado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao criar shopper:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Atualiza um shopper existente
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const shopperData = req.body;
            
            const result = await ShopperService.update(id, shopperData);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Shopper atualizado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao atualizar shopper ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Remove um shopper
     */
    async destroy(req, res) {
        try {
            const { id } = req.params;
            
            const result = await ShopperService.delete(id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Shopper removido com sucesso'
            });
        } catch (error) {
            console.error(`Erro ao remover shopper ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Sincroniza um shopper com o Asaas
     */
    async syncWithAsaas(req, res) {
        try {
            const { id } = req.params;
            
            const result = await ShopperService.syncWithAsaas(id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Shopper sincronizado com sucesso no Asaas',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao sincronizar shopper ID ${req.params.id} com Asaas:`, error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new ShopperController();