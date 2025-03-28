require('dotenv').config();
const NsService = require('../../services/ns.service');
const SellerService = require('../../services/seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsCustomersController {
    async getCustomers(req, res) {
        try {
            const { seller_id } = req.params;
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json(createError('Vendedor não encontrado', 404));
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await NsService.getCustomers(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
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
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getCustomerById(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
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
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.createCustomer(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
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
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.updateCustomer(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
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
            
            const seller = await SellerService.getById(seller_id);
            
            if (!seller) {
                return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await NsService.getCustomerOrders(
                seller.nuvemshop_id,
                seller.nuvemshop_token,
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
