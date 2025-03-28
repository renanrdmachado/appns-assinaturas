require('dotenv').config();
const NsService = require('../../services/ns.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsOrdersController {
    async getOrders(req, res) {
        try {
            const { seller_id } = req.params;
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json(createError('Vendedor não encontrado', 404));
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsService.getOrders(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar pedidos da Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async getOrderById(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getOrderById(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar pedido da Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async createOrder(req, res) {
        try {
            const { seller_id } = req.params;
            const orderData = req.body;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.createOrder(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                orderData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json(result);
        } catch (error) {
            console.error('Erro ao criar pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async updateOrder(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            const orderData = req.body;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.updateOrder(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id,
                orderData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async closeOrder(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.closeOrder(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao fechar pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async openOrder(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.openOrder(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao reabrir pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async cancelOrder(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.cancelOrder(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao cancelar pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async getOrderPayments(req, res) {
        try {
            const { seller_id, order_id } = req.params;
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getOrderPayments(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
                order_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar pagamentos do pedido na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
}

module.exports = new NsOrdersController();
