const axios = require('axios');
const { formatError } = require('../utils/errorHandler');

class NsApiClient {
    static async request({ method, storeId, endpoint, accessToken, params, data, headers = {} }) {
        try {
            if (!storeId) {
                console.error('Erro: storeId é null ou undefined');
                throw new Error('ID da loja (storeId) é obrigatório');
            }
            
            // Garantir que storeId seja string
            const storeIdStr = String(storeId).trim();
            
            if (storeIdStr === '') {
                console.error('Erro: storeId está vazio após trim');
                throw new Error('ID da loja (storeId) é obrigatório');
            }
            
            if (!accessToken) {
                console.error('Erro: accessToken é null ou undefined');
                throw new Error('Token de acesso (accessToken) é obrigatório');
            }
            
            const accessTokenStr = String(accessToken).trim();
            
            if (accessTokenStr === '') {
                console.error('Erro: accessToken está vazio após trim');
                throw new Error('Token de acesso (accessToken) é obrigatório');
            }
            
            const baseUrl = process.env.NS_API_URL || 'https://api.nuvemshop.com.br/v1';
            const url = `${baseUrl}/${storeIdStr}/${endpoint}${params ? `?${params.toString()}` : ''}`;
            
            console.log(`NsApiClient: Preparando requisição para ${url}`);
            console.log(`NsApiClient: Método: ${method}, StoreId: ${storeIdStr}`);
            
            const config = {
                method,
                url,
                headers: {
                    'Authentication': `bearer ${accessTokenStr}`,
                    'User-Agent': process.env.NS_APP_NAME || 'AppNS Assinaturas',
                    'Accept': 'application/json',
                    ...headers
                },
                data
            };
            
            if (data) {
                config.headers['Content-Type'] = 'application/json';
            }
            
            console.log(`Enviando requisição para Nuvemshop API: ${method} ${url}`);
            console.log('Headers:', JSON.stringify(config.headers, null, 2).replace(accessTokenStr, '****'));
            
            const response = await axios(config);
            console.log(`Resposta da Nuvemshop API: ${response.status}`);
            return response.data;
        } catch (error) {
            // Tratamento de erros específicos da Nuvemshop
            if (error.response) {
                const status = error.response.status;
                const nsResponse = error.response.data;
                
                // Criar mensagem de erro amigável baseada na resposta da Nuvemshop
                const errorMessage = nsResponse.message || 
                                    nsResponse.error_description || 
                                    nsResponse.error || 
                                    error.response.statusText || 
                                    error.message;
                
                // Criar um novo erro com os detalhes da Nuvemshop
                const enhancedError = new Error(errorMessage);
                enhancedError.nsError = {
                    status,
                    originalError: nsResponse
                };
                enhancedError.status = status;
                
                throw enhancedError;
            } else if (error.request) {
                // A requisição foi feita mas não houve resposta
                const networkError = new Error('Sem resposta do servidor Nuvemshop');
                networkError.request = error.request;
                throw networkError;
            } else {
                // Erro ao configurar a requisição
                throw error;
            }
        }
    }
}

module.exports = NsApiClient;
