const Order = require('../models/Order');
const { formatError } = require('../utils/errorHandler');
const OrderValidator = require('../validators/order-validator');

class OrderService {
    async get(id) {
        try {
            if (!id) {
                return { success: false, message: 'ID é obrigatório', status: 400 };
            }
            
            const order = await Order.findByPk(id);
            console.log("Service / Order: ", order);
            
            if (!order) {
                return { success: false, message: `Pedido com ID ${id} não encontrado`, status: 404 };
            }
            
            return { success: true, data: order };
        } catch (error) {
            console.error('Erro ao buscar pedido:', error.message);
            return formatError(error);
        }
    }
    
    async getAll(sellerId = null, customerId = null) {
        try {
            const whereClause = {};
            
            if (sellerId) {
                whereClause.seller_id = sellerId;
            }
            
            if (customerId) {
                whereClause.customer_id = customerId;
            }
            
            const orders = await Order.findAll({
                where: whereClause,
            });
            
            console.log("Service / All Orders count: ", orders.length);
            return { success: true, data: orders };
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error.message);
            return formatError(error);
        }
    }
    
    async create(data) {
        console.log('Order - creating...');
        try {
            // Validar dados do pedido
            OrderValidator.validateOrderData(data);

            const order = await Order.create({
                seller_id: data.seller_id,
                shopper_id: data.shopper_id,
                products: data.products,
                customer_info: data.customer_info,
                nuvemshop: data.nuvemshop,
                value: data.value,
                cycle: data.cycle,
                next_due_date: data.next_due_date,
                external_id: data.external_id,
                status: data.status || 'pending',
                payment_method: data.payment_method,
                billing_type: data.billing_type,
                metadata: data.metadata
            });
            
            console.log('Order created:', order.toJSON());
            return { success: true, data: order.toJSON() };
        } catch (error) {
            console.error('Erro ao criar pedido:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            const order = await Order.findByPk(id);
            
            if (!order) {
                return { success: false, message: `Pedido com ID ${id} não encontrado`, status: 404 };
            }
            
            // Validar dados de atualização
            OrderValidator.validateOrderUpdateData(data);
            
            await order.update({
                ...(data.seller_id && { seller_id: data.seller_id }),
                ...(data.shopper_id && { shopper_id: data.shopper_id }),
                ...(data.products && { products: data.products }),
                ...(data.customer_info && { customer_info: data.customer_info }),
                ...(data.nuvemshop && { nuvemshop: data.nuvemshop }),
                ...(data.value && { value: data.value }),
                ...(data.cycle && { cycle: data.cycle }),
                ...(data.next_due_date && { next_due_date: data.next_due_date }),
                ...(data.status && { status: data.status }),
                ...(data.external_id && { external_id: data.external_id }),
                ...(data.payment_method && { payment_method: data.payment_method }),
                ...(data.billing_type && { billing_type: data.billing_type }),
                ...(data.metadata && { metadata: data.metadata })
            });
            
            console.log('Order updated:', order.toJSON());
            return { success: true, data: order.toJSON() };
        } catch (error) {
            console.error('Erro ao atualizar pedido:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            const order = await Order.findByPk(id);
            
            if (!order) {
                return { success: false, message: `Pedido com ID ${id} não encontrado`, status: 404 };
            }
            
            await order.destroy();
            console.log(`Pedido com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Pedido com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir pedido:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new OrderService();
