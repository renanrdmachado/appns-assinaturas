require('dotenv').config();
const axios = require('axios');
const Seller = require('../models/Seller'); // Importação necessária para os novos métodos
const { formatError } = require('../utils/errorHandler');

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
                
                return { success: true, data: createResponse.data };
            } else {
                const error = new Error('Cliente já existe');
                error.name = 'CustomerExistsError';
                throw error;
            }
        } catch (error) {
            console.error('Erro ao adicionar cliente Asaas:', error.message);
            return formatError(error);
        }
    }

    async addSubAccount(accountData, sellerId) {
        try {
            const options = {
                method: 'GET',
                url: `${process.env.AS_URL}/accounts?cpfCnpj=${accountData.cpfCnpj}`,
                headers: {
                    'Accept': 'application/json',
                    'access_token': process.env.AS_TOKEN
                }
            };
            
            const response = await axios(options);
            const items = response.data;
            
            if (items.totalCount === 0) {
                const createResponse = await axios.post(
                    `${process.env.AS_URL}/accounts`,
                    accountData,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'access_token': process.env.AS_TOKEN
                        }
                    }
                );
                
                console.log("createAccount then", createResponse.data);
                const saveAccount = await Seller.saveSubAccountInfo(sellerId, createResponse.data);
                console.log("saveAccount", saveAccount);
                
                return createResponse.data;
            } else {
                console.log('hasAccount', items);
                const saveAccount = await Seller.saveSubAccountInfo(sellerId, items.data[0]);
                console.log("saveAccount", saveAccount);
                
                return items.data[0];
            }
        } catch (error) {
            console.error('Erro ao adicionar subconta Asaas:', error.message);
            return formatError(error);
        }
    }
    
    async getSubAccount(cpfCnpj = null) {
        try {
            const url = cpfCnpj ? `/accounts?cpfCnpj=${cpfCnpj}` : '/accounts';
            
            const options = {
                method: 'GET',
                url: `${process.env.AS_URL}${url}`,
                headers: {
                    'Accept': 'application/json',
                    'access_token': process.env.AS_TOKEN
                }
            };
            
            const response = await axios(options);
            const items = response.data;
            
            if (items.totalCount > 0) {
                console.log('hasAccount', items);
                return cpfCnpj ? items.data[0] : items.data;
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar subconta Asaas:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new AsaasService();