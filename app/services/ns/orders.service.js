const NsApiClient = require('../../helpers/NsApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

class NsOrdersService {
    async getOrders(storeId, accessToken, params = {}) {
        try {
            const orders = await NsApiClient.get({
                storeId,
                endpoint: 'orders',
                accessToken,
                params: new URLSearchParams(params)
            });
            
            return { success: true, data: orders };
        } catch (error) {
            console.error('Erro ao obter pedidos da Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async getOrderById(storeId, accessToken, orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await NsApiClient.get({
                storeId,
                endpoint: `orders/${orderId}`,
                accessToken
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao obter pedido ${orderId} da Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async createOrder(storeId, accessToken, orderData) {
        try {
            if (!orderData) {
                return createError('Dados do pedido são obrigatórios', 400);
            }
            
            const order = await NsApiClient.post({
                storeId,
                endpoint: 'orders',
                accessToken,
                data: orderData
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error('Erro ao criar pedido na Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async updateOrder(storeId, accessToken, orderId, orderData) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            if (!orderData) {
                return createError('Dados do pedido são obrigatórios', 400);
            }
            
            const order = await NsApiClient.put({
                storeId,
                endpoint: `orders/${orderId}`,
                accessToken,
                data: orderData
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao atualizar pedido ${orderId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async closeOrder(storeId, accessToken, orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await NsApiClient.post({
                storeId,
                endpoint: `orders/${orderId}/close`,
                accessToken
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao fechar pedido ${orderId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async openOrder(storeId, accessToken, orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await NsApiClient.post({
                storeId,
                endpoint: `orders/${orderId}/open`,
                accessToken
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao reabrir pedido ${orderId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async cancelOrder(storeId, accessToken, orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await NsApiClient.post({
                storeId,
                endpoint: `orders/${orderId}/cancel`,
                accessToken
            });
            
            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao cancelar pedido ${orderId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async getOrderPayments(storeId, accessToken, orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const payments = await NsApiClient.get({
                storeId,
                endpoint: `orders/${orderId}/payments`,
                accessToken
            });
            
            return { success: true, data: payments };
        } catch (error) {
            console.error(`Erro ao obter pagamentos do pedido ${orderId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new NsOrdersService();
