const Order = require('../models/Order');
const Shopper = require('../models/Shopper');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const { formatError, createError } = require('../utils/errorHandler');
const OrderValidator = require('../validators/order-validator');

class OrderService {
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const order = await Order.findByPk(id);
            console.log("Service / Order: ", order);
            
            if (!order) {
                return createError(`Pedido com ID ${id} não encontrado`, 404);
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
                // Campo correto é shopper_id
                whereClause.shopper_id = customerId;
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
        console.log('DEBUG - Dados recebidos para criar order:', JSON.stringify(data, null, 2));
        
        try {
            // 1:1 - Exigir product_id e determinar seller_id automaticamente a partir do produto
            if (!data.product_id) {
                return createError('product_id é obrigatório', 400);
            }

            const product = await Product.findByPk(data.product_id);
            if (!product) {
                return createError('Produto não encontrado', 404);
            }

            const automaticSellerId = product.seller_id;
            console.log('DEBUG - seller_id determinado pelo produto:', automaticSellerId);

            // Validar dados do pedido usando o validator (agora com o seller_id correto)
            try {
                const orderDataWithCorrectSeller = { ...data, seller_id: automaticSellerId };
                OrderValidator.validateOrderData(orderDataWithCorrectSeller);
                await OrderValidator.validateShopperExists(data.shopper_id, Shopper);
                await OrderValidator.validateSellerExists(automaticSellerId, Seller);
            } catch (validationError) {
                return formatError(validationError);
            }

            console.log('DEBUG - Dados que serão enviados para Order.create:', {
                seller_id: automaticSellerId,
                shopper_id: data.shopper_id,
                product_id: data.product_id
            });

            const order = await Order.create({
                seller_id: automaticSellerId,  // Usar o seller_id do produto
                shopper_id: data.shopper_id,
                product_id: data.product_id,
                value: data.value,
                customer_info: data.customer_info,
                nuvemshop: data.nuvemshop,
                // Dados de assinatura não são mais persistidos em Order
                metadata: data.metadata
            });
            
            console.log('DEBUG - Order criada com seller_id:', order.seller_id);
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
                return createError(`Pedido com ID ${id} não encontrado`, 404);
            }
            
            // Validar dados de atualização usando o validator
            try {
                OrderValidator.validateOrderUpdateData(data);
                
                // Se houver alteração no shopper_id, verificar se o novo comprador existe
                if (data.shopper_id && data.shopper_id !== order.shopper_id) {
                    await OrderValidator.validateShopperExists(data.shopper_id, Shopper);
                }
                
                if (data.seller_id && data.seller_id !== order.seller_id) {
                    await OrderValidator.validateSellerExists(data.seller_id, Seller);
                }
            } catch (validationError) {
                return formatError(validationError);
            }
            
            const updatePayload = {};
            if (data.seller_id !== undefined) updatePayload.seller_id = data.seller_id;
            if (data.shopper_id !== undefined) updatePayload.shopper_id = data.shopper_id;
            if (data.product_id !== undefined) updatePayload.product_id = data.product_id;
            if (data.value !== undefined) updatePayload.value = data.value;
            if (data.customer_info !== undefined) updatePayload.customer_info = data.customer_info;
            if (data.nuvemshop !== undefined) updatePayload.nuvemshop = data.nuvemshop;
            if (data.metadata !== undefined) updatePayload.metadata = data.metadata;

            await order.update(updatePayload);
            
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
