require('dotenv').config();
const NsShoppersService = require('../../services/ns/shoppers.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsShoppersController {
    /**
     * Lista todos os shoppers de um seller
     */
    async getShoppers(req, res) {
        try {
            const { seller_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json(seller);
            }
            
            // Verificações de segurança
            if (!seller.data.nuvemshop_id) {
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            if (!seller.data.nuvemshop_api_token) {
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsShoppersService.getSellerShoppers(
                seller_id,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar shoppers do vendedor:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca um shopper específico de um seller
     */
    async getShopperById(req, res) {
        try {
            const { seller_id, shopper_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Verificações de segurança
            if (!seller.data.nuvemshop_id) {
                return res.status(400).json(createError('ID da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            if (!seller.data.nuvemshop_api_token) {
                return res.status(400).json(createError('Token de API da Nuvemshop não encontrado para este vendedor', 400));
            }
            
            const result = await NsShoppersService.getSellerShopperById(
                seller_id,
                shopper_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar shopper do vendedor:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
}

module.exports = new NsShoppersController();