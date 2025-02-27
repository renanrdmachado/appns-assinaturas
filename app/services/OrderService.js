const Order = require('../models/Order');

class OrderService {
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
            return order.toJSON();
        } catch (error) {
            console.error('Erro ao criar pedido:', error.message);
            throw error;
        }
    }
}

module.exports = new OrderService();
