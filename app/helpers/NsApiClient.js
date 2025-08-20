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
            
            const baseUrl = process.env.NS_API_URL || 'https://api.nuvemshop.com.br/2025-03';
            let query = '';
            if (params) {
                if (typeof params === 'string') {
                    query = params.startsWith('?') ? params : `?${params}`;
                } else {
                    const usp = new URLSearchParams();
                    for (const [k, v] of Object.entries(params)) {
                        if (Array.isArray(v)) {
                            v.forEach(val => usp.append(k, val));
                        } else if (v !== undefined && v !== null) {
                            usp.append(k, String(v));
                        }
                    }
                    const qs = usp.toString();
                    query = qs ? `?${qs}` : '';
                }
            }
            const url = `${baseUrl}/${storeIdStr}/${endpoint}${query}`;
            
            console.log(`NsApiClient: Preparando requisição para ${url}`);
            console.log(`NsApiClient: Método: ${method}, StoreId: ${storeIdStr}`);
            
            const config = {
                method,
                url,
                headers: {
                    'Authentication': `bearer ${accessTokenStr}`,
                    'User-Agent': process.env.NS_USER_AGENT || 'APPNS / Assinaturas (https://assinaturas.appns.com.br/shop/suporte)',
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
            if (data) {
                try {
                    console.log('Body:', JSON.stringify(data));
                } catch (_) {
                    console.log('Body: [object]');
                }
            }
            
            const response = await axios(config);
            console.log(`Resposta da Nuvemshop API: ${response.status}`);
            return response.data;
        } catch (error) {
            // Tratamento de erros específicos da Nuvemshop
            if (error.response) {
                const status = error.response.status;
                const nsResponse = error.response.data;
                
                // Criar mensagem de erro amigável baseada na resposta da Nuvemshop
                const errorMessage = nsResponse?.message || 
                                    nsResponse.error_description || 
                                    nsResponse?.error || 
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

    static async get({ storeId, endpoint, accessToken, params, headers = {} }) {
        return this.request({ 
            method: 'GET', 
            storeId, 
            endpoint, 
            accessToken, 
            params, 
            headers 
        });
    }

    static async post({ storeId, endpoint, accessToken, data, headers = {} }) {
        return this.request({ 
            method: 'POST', 
            storeId, 
            endpoint, 
            accessToken, 
            data, 
            headers 
        });
    }

    static async put({ storeId, endpoint, accessToken, data, headers = {} }) {
        return this.request({ 
            method: 'PUT', 
            storeId, 
            endpoint, 
            accessToken, 
            data, 
            headers 
        });
    }

    static async delete({ storeId, endpoint, accessToken, headers = {} }) {
        return this.request({ 
            method: 'DELETE', 
            storeId, 
            endpoint, 
            accessToken, 
            headers 
        });
    }
    
    static async getShippingCarriers({ storeId, accessToken }) {
        return this.get({
            storeId, 
            endpoint: 'shipping_carriers', 
            accessToken
        });
    }
    
    static async getShippingCarrier({ storeId, accessToken, carrierId }) {
        return this.get({
            storeId, 
            endpoint: `shipping_carriers/${carrierId}`, 
            accessToken
        });
    }
    
    // Métodos POST, PUT e DELETE de transportadoras removidos, mantendo apenas os GETs
    
    static async getShippingCarrierOptions({ storeId, accessToken, carrierId }) {
        return this.get({
            storeId, 
            endpoint: `shipping_carriers/${carrierId}/options`, 
            accessToken
        });
    }
    
    static async getShippingCarrierOption({ storeId, accessToken, carrierId, optionId }) {
        return this.get({
            storeId, 
            endpoint: `shipping_carriers/${carrierId}/options/${optionId}`, 
            accessToken
        });
    }
    
    // Métodos POST, PUT e DELETE de opções de transportadoras removidos, mantendo apenas os GETs
    
    static async getFulfillmentEvents({ storeId, accessToken, orderId }) {
        return this.get({
            storeId, 
            endpoint: `orders/${orderId}/fulfillments`, 
            accessToken
        });
    }
    
    static async getFulfillmentEvent({ storeId, accessToken, orderId, fulfillmentId }) {
        return this.get({
            storeId, 
            endpoint: `orders/${orderId}/fulfillments/${fulfillmentId}`, 
            accessToken
        });
    }
    
    // Métodos POST e DELETE de eventos de entrega removidos, mantendo apenas os GETs
}

module.exports = NsApiClient;
