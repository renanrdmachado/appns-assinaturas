require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasValidator = require('../../validators/asaas-validator');
const SellerService = require('../seller.service');
const { formatError, createError } = require('../../utils/errorHandler');

class SubAccountService {
    async addSubAccount(accountData) {
        try {
            // Usar o validator para validar os dados da subconta
            AsaasValidator.validateSubAccountData(accountData);

            const existingSeller = await SellerService.findByCpfCnpj(accountData.cpfCnpj);
            if (existingSeller && existingSeller.data && existingSeller.data.subaccount_id) {
                return createError('Subconta já existe para este CPF/CNPJ', 400);
            }

            const params = new URLSearchParams();
            params.append('cpfCnpj', accountData.cpfCnpj);
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts',
                params
            });

            let subAccountData;
            if (items.totalCount === 0) {
                subAccountData = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'accounts',
                    data: accountData
                });
            } else {
                subAccountData = items.data[0];
            }

            return { success: true, data: subAccountData };
        } catch (error) {
            // Garantir que os erros da API do Asaas sejam capturados corretamente
            console.error('Erro ao adicionar subconta no Asaas:', error);
            return formatError(error);
        }
    }

    async getAllSubAccounts() {
        try {
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts'
            });
            
            const data = items.totalCount > 0 ? items.data : [];
            return { success: true, data: data };
        } catch (error) {
            return formatError(error);
        }
    }

    async getSubAccountByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório', 400);
            }
            
            const params = new URLSearchParams();
            params.append('cpfCnpj', cpfCnpj);
            
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts',
                params
            });
            
            if (items.totalCount === 0) {
                return createError('Nenhuma subconta encontrada para o CPF/CNPJ informado', 404);
            }
            
            return { success: true, data: items.data[0] };
        } catch (error) {
            return formatError(error);
        }
    }
    
    async getSubAccount(cpfCnpj) {
        return await this.getSubAccountByCpfCnpj(cpfCnpj);
    }
}

module.exports = new SubAccountService();
