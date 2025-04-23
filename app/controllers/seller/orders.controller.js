const SellerOrdersService = require('../../services/seller/orders.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class SellerOrdersController {
    /**
     * Lista todos os pedidos (orders) de um seller
     */
    async getOrders(req, res) {
        try {
            const { seller_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            // Buscar pedidos usando o serviço
            const result = await SellerOrdersService.getSellerOrders(seller_id, params);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json(result);
        } catch (error) {
            console.error(`Erro ao buscar pedidos do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Busca um pedido específico vinculado a um seller
     */
    async getOrderById(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Buscar pedido usando o serviço
            const result = await SellerOrdersService.getSellerOrderById(seller_id, order_id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json(result);
        } catch (error) {
            console.error(`Erro ao buscar pedido ID ${req.params.order_id} do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new SellerOrdersController();