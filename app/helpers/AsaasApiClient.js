const axios = require('axios');

class AsaasApiClient {
    static async request({ method, endpoint, params, data, headers = {} }) {
        try {
            const baseUrl = process.env.AS_URL; // e.g., https://api-sandbox.asaas.com/v3
            const url = `${baseUrl}/${endpoint}${params ? `?${params.toString()}` : ''}`;
            const config = {
                method,
                url,
                headers: {
                    'Accept': 'application/json',
                    access_token: process.env.AS_TOKEN,
                    ...headers
                },
                data
            };
            
            const response = await axios(config);
            return response.data;
        } catch (error) {
            // Capturar e formatar o erro da API Asaas
            if (error.response) {
                // Extrair informações úteis
                const status = error.response.status;
                const asaasResponse = error.response.data;
                
                // Verificar se tem o formato padrão de erros do Asaas
                const hasStandardErrors = asaasResponse && 
                                        asaasResponse.errors && 
                                        Array.isArray(asaasResponse.errors);
                
                // Criar mensagem de erro amigável
                const errorMessage = hasStandardErrors
                    ? asaasResponse.errors.map(e => e.description).join(', ')
                    : (asaasResponse.message || error.response.statusText || error.message);
                
                // Criar um novo erro com os detalhes do Asaas
                const enhancedError = new Error(errorMessage);
                enhancedError.asaasError = {
                    status,
                    errors: hasStandardErrors ? asaasResponse.errors : [],
                    originalError: asaasResponse
                };
                enhancedError.status = status;
                
                throw enhancedError;
            } else if (error.request) {
                // A requisição foi feita mas não houve resposta
                const networkError = new Error('Sem resposta do servidor Asaas');
                networkError.request = error.request;
                throw networkError;
            } else {
                // Erro ao configurar a requisição
                throw error;
            }
        }
    }
}

module.exports = AsaasApiClient;
