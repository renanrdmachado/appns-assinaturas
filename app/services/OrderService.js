const Order = require('../models/Order');
const { formatError } = require('../utils/errorHandler');

class OrderService {
    async get(id) {
        try {
            if (!id) {
                return null;
            }
            
            const order = await Order.findByPk(id);
            console.log("Service / Order: ", order);
            return order;
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
            return orders;
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error.message);
            return formatError(error);
        }
    }
    
    async create(data) {
        console.log('Order - creating...');
        try {
            const order = await Order.create({
                seller_id: data.seller_id,
                products: data.products,
                customer_id: data.customer_id,
                customer_info: data.customer_info,
                nuvemshop: data.nuvemshop,
                value: data.value,
                cycle: data.cycle,
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
                throw new Error(`Pedido com ID ${id} não encontrado`);
            }
            
            await order.update({
                seller_id: data.seller_id,
                products: data.products,
                customer_id: data.customer_id,
                customer_info: data.customer_info,
                nuvemshop: data.nuvemshop,
                value: data.value,
                cycle: data.cycle,
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
                throw new Error(`Pedido com ID ${id} não encontrado`);
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
