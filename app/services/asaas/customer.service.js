require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasValidator = require('../../validators/asaas-validator');
const { formatError } = require('../../utils/errorHandler');

class AsaasCustomerService {
    constructor() {
        // Defina as constantes como propriedades da instância
        this.SELLER_GROUP = 'SELLERS';
        this.SHOPPER_GROUP = 'SHOPPERS';
    }

    /**
     * Cria ou atualiza um cliente no Asaas
     * @param {Object} customerData - Dados do cliente
     * @param {string} groupName - Nome do grupo (SELLERS ou SHOPPERS)
     * @returns {Promise<Object>} - Resultado da operação
     */
    async createOrUpdate(customerData, groupName) {
        try {
            // Validação básica
            if (!customerData) {
                return {
                    success: false,
                    message: 'Dados do cliente são obrigatórios',
                    status: 400
                };
            }

            if (!customerData.name || !customerData.cpfCnpj) {
                return {
                    success: false,
                    message: 'Nome e CPF/CNPJ são obrigatórios',
                    status: 400
                };
            }

            // Validação do CPF/CNPJ
            if (!this._isValidCpfCnpj(customerData.cpfCnpj)) {
                return {
                    success: false,
                    message: 'CPF/CNPJ inválido',
                    status: 400
                };
            }

            // Sempre definir o grupo correto
            customerData.groupName = groupName;

            // Verificar se o cliente já existe por CPF/CNPJ
            const existingCustomer = await this.findByCpfCnpj(customerData.cpfCnpj, groupName);

            if (existingCustomer.success) {
                // Se existe, atualiza
                const result = await AsaasApiClient.request({
                    method: 'put',
                    endpoint: `customers/${existingCustomer.data.id}`,
                    data: customerData
                });

                console.log(`Cliente do grupo ${groupName} atualizado no Asaas:`, result.id);
                return { success: true, data: result, isNew: false };
            } else {
                // Se não existe, cria
                const result = await AsaasApiClient.request({
                    method: 'post',
                    endpoint: 'customers',
                    data: customerData
                });

                console.log(`Cliente do grupo ${groupName} criado no Asaas:`, result.id);
                return { success: true, data: result, isNew: true };
            }
        } catch (error) {
            console.error(`Erro ao criar/atualizar cliente no grupo ${groupName}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Busca um cliente no Asaas por CPF/CNPJ
     * @param {string} cpfCnpj - CPF ou CNPJ do cliente
     * @param {string} groupName - Nome do grupo (SELLERS ou SHOPPERS)
     * @returns {Promise<Object>} - Resultado da operação
     */
    async findByCpfCnpj(cpfCnpj, groupName) {
        try {
            if (!cpfCnpj) {
                return {
                    success: false,
                    message: 'CPF/CNPJ é obrigatório',
                    status: 400
                };
            }

            if (!groupName) {
                return {
                    success: false,
                    message: `Grupo é obrigatório. Use '${this.SELLER_GROUP}' ou '${this.SHOPPER_GROUP}'`,
                    status: 400
                };
            }

            // Parâmetros da busca
            const params = new URLSearchParams({ cpfCnpj });
            params.append('groupName', groupName);

            // Chamada para API do Asaas
            const result = await AsaasApiClient.request({
                method: 'get',
                endpoint: 'customers',
                params
            });

            // Verificar se encontrou algum cliente
            if (!result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: `Cliente com CPF/CNPJ ${cpfCnpj} não encontrado no grupo ${groupName}`,
                    status: 404
                };
            }

            // Retornar o primeiro cliente encontrado (normalmente apenas um)
            return { success: true, data: result.data[0] };
        } catch (error) {
            console.error('Erro ao buscar cliente no Asaas por CPF/CNPJ:', error.message);
            return formatError(error);
        }
    }

    /**
     * Busca um cliente no Asaas por ID externo (nuvemshop_id)
     * @param {string} externalId - ID externo do cliente
     * @param {string} groupName - Nome do grupo (SELLERS ou SHOPPERS)
     * @returns {Promise<Object>} - Resultado da operação
     */
    async findByExternalReference(externalId, groupName) {
        try {
            if (!externalId) {
                return {
                    success: false,
                    message: 'ID externo é obrigatório',
                    status: 400
                };
            }

            if (!groupName) {
                return {
                    success: false,
                    message: `Grupo é obrigatório. Use '${this.SELLER_GROUP}' ou '${this.SHOPPER_GROUP}'`,
                    status: 400
                };
            }

            // Parâmetros da busca
            const params = new URLSearchParams({ externalReference: externalId });
            params.append('groupName', groupName);

            // Chamada para API do Asaas
            const result = await AsaasApiClient.request({
                method: 'get',
                endpoint: 'customers',
                params
            });

            // Verificar se encontrou algum cliente
            if (!result.data || result.data.length === 0) {
                return {
                    success: false, 
                    message: `Cliente com referência externa ${externalId} não encontrado no grupo ${groupName}`,
                    status: 404
                };
            }

            // Retornar o primeiro cliente encontrado
            return { success: true, data: result.data[0] };
        } catch (error) {
            console.error('Erro ao buscar cliente no Asaas por ID externo:', error.message);
            return formatError(error);
        }
    }

    /**
     * Lista clientes no Asaas por grupo
     * @param {string} groupName - Nome do grupo (SELLERS ou SHOPPERS)
     * @param {Object} filters - Filtros adicionais (offset, limit, etc)
     * @returns {Promise<Object>} - Resultado da operação
     */
    async listByGroup(groupName, filters = {}) {
        try {
            if (!groupName) {
                return {
                    success: false,
                    message: 'Nome do grupo é obrigatório',
                    status: 400
                };
            }

            // Parâmetros da busca
            const params = new URLSearchParams({ groupName });
            
            // Adicionar filtros adicionais
            for (const key in filters) {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            }

            // Chamada para API do Asaas
            const result = await AsaasApiClient.request({
                method: 'get',
                endpoint: 'customers',
                params
            });

            return { 
                success: true, 
                data: result.data || [],
                hasMore: result.hasMore,
                totalCount: result.totalCount
            };
        } catch (error) {
            console.error(`Erro ao listar clientes do grupo ${groupName}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Remove um cliente no Asaas
     * @param {string} id - ID do cliente no Asaas
     * @returns {Promise<Object>} - Resultado da operação
     */
    async remove(id) {
        try {
            if (!id) {
                return {
                    success: false,
                    message: 'ID do cliente é obrigatório',
                    status: 400
                };
            }

            // Chamada para API do Asaas
            const result = await AsaasApiClient.request({
                method: 'delete',
                endpoint: `customers/${id}`
            });

            console.log(`Cliente removido no Asaas:`, id);
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro ao remover cliente no Asaas:', error.message);
            return formatError(error);
        }
    }

    // Método auxiliar para validação de CPF/CNPJ
    _isValidCpfCnpj(cpfCnpj) {
        // Remove caracteres não numéricos
        const numbers = cpfCnpj.replace(/\D/g, '');
        
        // Verifica se é CPF (11 dígitos) ou CNPJ (14 dígitos)
        return numbers.length === 11 || numbers.length === 14;
    }
}

module.exports = new AsaasCustomerService();
