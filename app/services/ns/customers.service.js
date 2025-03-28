const NsApiClient = require('../../helpers/NsApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

class NsCustomersService {
    async getCustomers(storeId, accessToken, params = {}) {
        try {
            const customers = await NsApiClient.request({
                method: 'GET',
                storeId,
                endpoint: 'customers',
                accessToken,
                params: new URLSearchParams(params)
            });
            
            return { success: true, data: customers };
        } catch (error) {
            console.error('Erro ao obter clientes da Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async getCustomerById(storeId, accessToken, customerId) {
        try {
            if (!customerId) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            const customer = await NsApiClient.request({
                method: 'GET',
                storeId,
                endpoint: `customers/${customerId}`,
                accessToken
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error(`Erro ao obter cliente ${customerId} da Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async createCustomer(storeId, accessToken, customerData) {
        try {
            if (!customerData || !customerData.email) {
                return createError('Dados do cliente são obrigatórios, incluindo email', 400);
            }
            
            const customer = await NsApiClient.request({
                method: 'POST',
                storeId,
                endpoint: 'customers',
                accessToken,
                data: customerData
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error('Erro ao criar cliente na Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async updateCustomer(storeId, accessToken, customerId, customerData) {
        try {
            if (!customerId) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            if (!customerData) {
                return createError('Dados do cliente são obrigatórios', 400);
            }
            
            const customer = await NsApiClient.request({
                method: 'PUT',
                storeId,
                endpoint: `customers/${customerId}`,
                accessToken,
                data: customerData
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error(`Erro ao atualizar cliente ${customerId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async getCustomerOrders(storeId, accessToken, customerId) {
        try {
            if (!customerId) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            const orders = await NsApiClient.request({
                method: 'GET',
                storeId,
                endpoint: `customers/${customerId}/orders`,
                accessToken
            });
            
            return { success: true, data: orders };
        } catch (error) {
            console.error(`Erro ao obter pedidos do cliente ${customerId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new NsCustomersService();
