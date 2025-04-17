require('dotenv').config();
const NsService = require('../../services/ns.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsOrdersController {
    async getOrders(req, res) {
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
            
            const result = await NsService.getOrders(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.getOrderById(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.createOrder(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.updateOrder(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.closeOrder(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.openOrder(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.cancelOrder(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
            
            const result = await NsService.getOrderPayments(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_api_token,
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
