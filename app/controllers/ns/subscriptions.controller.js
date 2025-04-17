require('dotenv').config();
const NsSubscriptionsService = require('../../services/ns/subscriptions.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsSubscriptionsController {
    /**
     * Lista todas as assinaturas de shoppers de um seller
     */
    async getSubscriptions(req, res) {
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
            
            const result = await NsSubscriptionsService.getSellerSubscriptions(
                seller_id,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinaturas dos clientes do vendedor:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca uma assinatura específica relacionada a um seller
     */
    async getSubscriptionById(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
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
            
            const result = await NsSubscriptionsService.getSellerSubscriptionById(
                seller_id,
                subscription_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinatura associada ao vendedor:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    /**
     * Lista todas as assinaturas de um shopper específico de um seller
     */
    async getShopperSubscriptions(req, res) {
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
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsSubscriptionsService.getSellerShopperSubscriptions(
                seller_id,
                shopper_id,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinaturas do cliente para o vendedor:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
}

module.exports = new NsSubscriptionsController();