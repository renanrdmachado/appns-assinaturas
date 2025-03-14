require('dotenv').config();
const axios = require('axios');
const SellerService = require('./SellerService');
const { formatError } = require('../utils/errorHandler');

class NsService {
    async authorize(code) {
        try {
            const response = await axios.post('https://www.nuvemshop.com.br/apps/authorize/token', {
                'client_id': process.env.NS_CLIENT_ID,
                'client_secret': process.env.NS_CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code
            });
            
            const data = response.data;
            
            if (data.access_token) {
                const seller = await SellerService.create(data);
                await this.getAndSaveStoreInfo(data);
                return { success: true, data };
            }
            
            return { success: false, message: 'Falha na autorização', data };
        } catch (error) {
            console.error('Erro na autorização Nuvemshop:', error.message);
            return formatError(error);
        }
    }

    async getAndSaveStoreInfo(store) {
        try {
            const options = {
                method: 'GET',
                url: `https://api.nuvemshop.com.br/v1/${store.user_id}/store`,
                headers: {
                    'Authentication': `bearer ${store.access_token}`,
                    'User-Agent': process.env.NS_APP_NAME
                }
            };

            const response = await axios(options);
            await SellerService.updateStoreInfo(store.user_id, response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Erro ao obter informações da loja:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new NsService();
