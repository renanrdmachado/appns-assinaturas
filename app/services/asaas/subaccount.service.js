require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasValidator = require('../../validators/asaas-validator');
const { formatError, createError } = require('../../utils/errorHandler');

class SubAccountService {
    async addSubAccount(accountData) {
        try {
            // Usar o validator para validar os dados da subconta
            AsaasValidator.validateSubAccountData(accountData);

            // Requerir SellerService dinamicamente para evitar dependência circular
            const SellerService = require('../../services/seller.service');
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

            console.log(`DEBUG - Verificação de subconta existente: totalCount=${items.totalCount}, cpfCnpj=${accountData.cpfCnpj}`);

            let subAccountData;
            if (items.totalCount === 0) {
                // CPF não existe, criar nova subconta
                console.log(`CPF ${accountData.cpfCnpj} não encontrado no Asaas. Criando nova subconta...`);
                subAccountData = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'accounts',
                    data: accountData
                });
            } else {
                // CPF já existe, reutilizar subconta existente
                console.log(`CPF ${accountData.cpfCnpj} já existe no Asaas. Reutilizando subconta existente...`);
                subAccountData = items.data[0];

                // Verificar se a subconta está ativa
                if (subAccountData.status !== 'APPROVED') {
                    console.warn(`Subconta existente tem status: ${subAccountData.status}. Pode haver restrições.`);
                }
            }

            return { success: true, data: subAccountData };
        } catch (error) {
            // Garantir que os erros da API do Asaas sejam capturados corretamente
            console.error('Erro ao adicionar subconta no Asaas:', error);

            // Verificar se é erro de CPF já em uso
            if (error.message && error.message.includes('CPF') && error.message.includes('já está em uso')) {
                console.log('CPF já em uso detectado. Tentando buscar subconta existente...');
                try {
                    const params = new URLSearchParams();
                    params.append('cpfCnpj', accountData.cpfCnpj);
                    const existingItems = await AsaasApiClient.request({
                        method: 'GET',
                        endpoint: 'accounts',
                        params
                    });

                    if (existingItems.totalCount > 0) {
                        console.log('Subconta existente encontrada. Reutilizando...');
                        return { success: true, data: existingItems.data[0] };
                    }
                } catch (retryError) {
                    console.error('Falha ao buscar subconta existente após erro de CPF em uso:', retryError);
                }
            }

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
