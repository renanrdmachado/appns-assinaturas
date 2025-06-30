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
        console.log('DEBUG - Dados recebidos para criar order:', JSON.stringify(data, null, 2));
        console.log('DEBUG - seller_id recebido:', data.seller_id, typeof data.seller_id);
        
        try {
            // Validar dados do pedido usando o validator
            try {
                OrderValidator.validateOrderData(data);
                await OrderValidator.validateShopperExists(data.shopper_id, Shopper);
                await OrderValidator.validateSellerExists(data.seller_id, Seller);
            } catch (validationError) {
                return formatError(validationError);
            }

            // Calcular o valor total dos produtos
            let total = 0;
            if (!Array.isArray(data.products) || data.products.length === 0) {
                return createError('Lista de produtos é obrigatória e deve conter ao menos um produto', 400);
            }
            // Buscar todos os produtos pelo array de IDs
            const productIds = data.products.map(p => typeof p === 'object' && p.product_id ? p.product_id : p);
            const foundProducts = await Product.findAll({ where: { id: productIds } });
            if (foundProducts.length !== productIds.length) {
                return createError('Um ou mais produtos não foram encontrados', 404);
            }
            // Somar os preços multiplicados pela quantidade (se houver)
            total = foundProducts.reduce((sum, prod) => {
                // Verifica se há quantidade informada no array de produtos
                const prodInfo = data.products.find(p => (p.product_id || p) == prod.id);
                const quantity = prodInfo && prodInfo.quantity ? parseInt(prodInfo.quantity) : 1;
                return sum + (prod.price * quantity);
            }, 0);

            console.log('DEBUG - Antes de criar order, seller_id:', data.seller_id);
            console.log('DEBUG - Dados que serão enviados para Order.create:', {
                seller_id: data.seller_id,
                shopper_id: data.shopper_id,
                products: data.products,
                value: total
            });

            const order = await Order.create({
                seller_id: data.seller_id,
                shopper_id: data.shopper_id,
                products: data.products,
                customer_info: data.customer_info,
                nuvemshop: data.nuvemshop,
                value: total,
                cycle: data.cycle,
                next_due_date: data.next_due_date,
                external_id: data.external_id,
                status: data.status || 'pending',
                payment_method: data.payment_method,
                billing_type: data.billing_type,
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
