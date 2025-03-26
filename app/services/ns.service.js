require('dotenv').config();
const axios = require('axios');
const SellerService = require('./seller.service');
const { formatError, createError } = require('../utils/errorHandler');

class NsService {
    async authorize(code) {
        try {
            if (!code) {
                return createError('Código de autorização é obrigatório', 400);
            }
            
            const response = await axios.post('https://www.nuvemshop.com.br/apps/authorize/token', {
                'client_id': process.env.NS_CLIENT_ID,
                'client_secret': process.env.NS_CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code
            });
            
            const data = response.data;
            
            if (!data.access_token) {
                return createError('Falha na autorização: Token não recebido', 400);
            }
            
            await this.getAndSaveStoreInfo(data);
            return { success: true, data };
        } catch (error) {
            console.error('Erro na autorização Nuvemshop:', error.message);
            return formatError(error);
        }
    }

    async getAndSaveStoreInfo(store) {
        try {
            if (!store || !store.user_id || !store.access_token) {
                return createError('Informações da loja são obrigatórias', 400);
            }
            
            const options = {
                method: 'GET',
                url: `https://api.nuvemshop.com.br/v1/${store.user_id}/store`,
                headers: {
                    'Authentication': `bearer ${store.access_token}`,
                    'User-Agent': process.env.NS_APP_NAME
                }
            };

            const response = await axios(options);
            const result = await SellerService.updateStoreInfo(store.user_id, store.access_token, response.data);
            
            if (!result.success) {
                return result; // Propagar erro do SellerService
            }
            
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Erro ao obter informações da loja:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new NsService();
