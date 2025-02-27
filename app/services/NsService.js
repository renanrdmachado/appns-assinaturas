require('dotenv').config();
const axios = require('axios');
const SellerService = require('./SellerService');

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
                // Criando o vendedor com os dados da Nuvemshop
                const seller = await SellerService.create(data);
                
                // Buscando e salvando informações adicionais da loja
                await this.getAndSaveStoreInfo(data);
                
                return data;
            }
            
            return data;
        } catch (error) {
            console.error('Erro na autorização Nuvemshop:', error.message);
            throw error;
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
            
            // Atualizar o vendedor com as informações da loja
            await SellerService.updateStoreInfo(store.user_id, response.data);
            
            return response.data;
        } catch (error) {
            console.error('Erro ao obter informações da loja:', error.message);
            throw error;
        }
    }
}

module.exports = new NsService();
