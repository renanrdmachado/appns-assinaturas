require('dotenv').config();
const axios = require('axios');

class AsaasService {
    async addCustomer(customerData) {
        try {
            // Verificar se o cliente já existe
            const options = {
                method: 'GET',
                url: `${process.env.AS_URL}/customers?cpfCnpj=${customerData.cpfCnpj}`,
                headers: {
                    'Accept': 'application/json',
                    'access_token': process.env.AS_TOKEN
                }
            };
            
            const response = await axios(options);
            const items = response.data;
            
            // Se o cliente não existir, cria um novo
            if (items.totalCount === 0) {
                const createResponse = await axios.post(
                    `${process.env.AS_URL}/customers`,
                    customerData,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'access_token': process.env.AS_TOKEN
                        }
                    }
                );
                
                return createResponse.data;
            } else {
                // Cliente já existe
                return { 
                    success: true, 
                    message: 'Cliente já existe',
                    customer: items.data[0] 
                };
            }
        } catch (error) {
            console.error('Erro ao adicionar cliente Asaas:', error.message);
            throw error;
        }
    }
}

module.exports = new AsaasService();
