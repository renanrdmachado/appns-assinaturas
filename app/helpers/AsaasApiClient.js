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
            throw error;
        }
    }
}

module.exports = AsaasApiClient;
