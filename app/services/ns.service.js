require('dotenv').config();
const axios = require('axios');
const SellerService = require('./seller.service');
const { formatError, createError } = require('../utils/errorHandler');
const NsApiClient = require('../helpers/NsApiClient');
const NsProductsService = require('./ns/products.service');
const NsOrdersService = require('./ns/orders.service');
const querystring = require('querystring');

class NsService {
    async authorize(code) {
        try {
            if (!code) {
                return createError('Código de autorização é obrigatório', 400);
            }
            
            console.log(`Tentando autorizar com código: ${code}`);
            
            // Criando o corpo da requisição no formato application/x-www-form-urlencoded
            const requestBody = querystring.stringify({
                client_id: process.env.NS_CLIENT_ID,
                client_secret: process.env.NS_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code
            });
            
            // Definindo explicitamente o Content-Type como application/x-www-form-urlencoded
            const response = await axios.post('https://www.nuvemshop.com.br/apps/authorize/token', 
                requestBody, 
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                }
            );
            
            console.log('Resposta da API da Nuvemshop recebida');
            const data = response.data;
            if (!data.access_token) {
                console.error('Token não recebido na resposta:', data);
                return createError('Falha na autorização: Token não recebido', 400);
            }
            
            console.log('Token recebido com sucesso:', data.access_token.slice(0, 10) + '...');
            
            await this.getAndSaveStoreInfo(data);
            return { success: true, data };
        } catch (error) {
            console.error('Erro na autorização Nuvemshop:', error);
            
            // Log adicional para depuração
            if (error.response) {
                console.error('Detalhes da resposta de erro:');
                console.error('Status:', error.response.status);
                console.error('Headers:', error.response.headers);
                console.error('Corpo:', error.response.data);
            }
            
            return formatError(error);
        }
    }

    async getAndSaveStoreInfo(store) {
        try {
            if (!store || !store.user_id || !store.access_token) {
                return createError('Informações da loja são obrigatórias', 400);
            }
            
            console.log(`Obtendo informações da loja Nuvemshop ID: ${store.user_id}`);
            
            // Usando o novo cliente de API NsApiClient
            const storeData = await NsApiClient.request({
                method: 'GET',
                storeId: store.user_id, // Este é o ID correto da loja na Nuvemshop
                endpoint: 'store',
                accessToken: store.access_token
            });
            
            const result = await SellerService.updateStoreInfo(store.user_id, store.access_token, storeData);
            
            if (!result.success) {
                return result; // Propagar erro do SellerService
            }
            
            return { success: true, data: storeData };
        } catch (error) {
            console.error('Erro ao obter informações da loja:', error.message);
            return formatError(error);
        }
    }
    
    // Delegando para os serviços específicos
    
    // Produtos
    async getProducts(storeId, accessToken, params = {}) {
        return await NsProductsService.getProducts(storeId, accessToken, params);
    }
    
    async getProductById(storeId, accessToken, productId) {
        return await NsProductsService.getProductById(storeId, accessToken, productId);
    }
    
    async createProduct(storeId, accessToken, productData) {
        return await NsProductsService.createProduct(storeId, accessToken, productData);
    }
    
    async updateProduct(storeId, accessToken, productId, productData) {
        return await NsProductsService.updateProduct(storeId, accessToken, productId, productData);
    }
    
    async deleteProduct(storeId, accessToken, productId) {
        return await NsProductsService.deleteProduct(storeId, accessToken, productId);
    }
    
    async getProductVariants(storeId, accessToken, productId) {
        return await NsProductsService.getProductVariants(storeId, accessToken, productId);
    }
    
    // Pedidos
    async getOrders(storeId, accessToken, params = {}) {
        return await NsOrdersService.getOrders(storeId, accessToken, params);
    }
    
    async getOrderById(storeId, accessToken, orderId) {
        return await NsOrdersService.getOrderById(storeId, accessToken, orderId);
    }
    
    async createOrder(storeId, accessToken, orderData) {
        return await NsOrdersService.createOrder(storeId, accessToken, orderData);
    }
    
    async updateOrder(storeId, accessToken, orderId, orderData) {
        return await NsOrdersService.updateOrder(storeId, accessToken, orderId, orderData);
    }
    
    async closeOrder(storeId, accessToken, orderId) {
        return await NsOrdersService.closeOrder(storeId, accessToken, orderId);
    }
    
    async openOrder(storeId, accessToken, orderId) {
        return await NsOrdersService.openOrder(storeId, accessToken, orderId);
    }
    
    async cancelOrder(storeId, accessToken, orderId) {
        return await NsOrdersService.cancelOrder(storeId, accessToken, orderId);
    }
    
    // Clientes
    async getCustomers(storeId, accessToken, params = {}) {
        return await NsCustomersService.getCustomers(storeId, accessToken, params);
    }
    
    async getCustomerById(storeId, accessToken, customerId) {
        return await NsCustomersService.getCustomerById(storeId, accessToken, customerId);
    }
    
    async createCustomer(storeId, accessToken, customerData) {
        return await NsCustomersService.createCustomer(storeId, accessToken, customerData);
    }
    
    async updateCustomer(storeId, accessToken, customerId, customerData) {
        return await NsCustomersService.updateCustomer(storeId, accessToken, customerId, customerData);
    }
}

module.exports = new NsService();
