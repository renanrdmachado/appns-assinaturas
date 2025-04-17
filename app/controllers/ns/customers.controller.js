require('dotenv').config();
const NsService = require('../../services/ns.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsCustomersController {
    async getCustomers(req, res) {
        try {
            const { seller_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json(seller);
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsService.getCustomers(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_token,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar clientes da Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    async getCustomerById(req, res) {
        try {
            const { seller_id, customer_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getCustomerById(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_token,
                customer_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar cliente da Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async createCustomer(req, res) {
        try {
            const { seller_id } = req.params;
            const customerData = req.body;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.createCustomer(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_token,
                customerData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json(result);
        } catch (error) {
            console.error('Erro ao criar cliente na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async updateCustomer(req, res) {
        try {
            const { seller_id, customer_id } = req.params;
            const customerData = req.body;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.updateCustomer(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_token,
                customer_id,
                customerData
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar cliente na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    async getCustomerOrders(req, res) {
        try {
            const { seller_id, customer_id } = req.params;
            
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getCustomerOrders(
                seller.data.nuvemshop_id,
                seller.data.nuvemshop_token,
                customer_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar pedidos do cliente na Nuvemshop:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
}

module.exports = new NsCustomersController();
