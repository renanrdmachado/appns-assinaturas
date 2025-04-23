const SellerShoppersService = require('../../services/seller/shoppers.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class SellerShoppersController {
    /**
     * Lista todos os shoppers (clientes) vinculados a um seller
     */
    async getShoppers(req, res) {
        try {
            const { seller_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            // Buscar shoppers usando o novo serviço
            const result = await SellerShoppersService.getSellerShoppers(seller_id, params);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json(result);
        } catch (error) {
            console.error(`Erro ao buscar shoppers do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Busca um shopper específico vinculado a um seller
     */
    async getShopperById(req, res) {
        try {
            const { seller_id, shopper_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Buscar shopper usando o novo serviço
            const result = await SellerShoppersService.getSellerShopperById(seller_id, shopper_id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json(result);
        } catch (error) {
            console.error(`Erro ao buscar shopper ID ${req.params.shopper_id} do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new SellerShoppersController();