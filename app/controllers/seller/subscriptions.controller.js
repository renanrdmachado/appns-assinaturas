const SellerSubscriptionsService = require('../../services/seller/subscriptions.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class SellerSubscriptionsController {
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
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await SellerSubscriptionsService.getSellerSubscriptions(
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
            
            const result = await SellerSubscriptionsService.getSellerSubscriptionById(
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
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await SellerSubscriptionsService.getSellerShopperSubscriptions(
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

module.exports = new SellerSubscriptionsController();