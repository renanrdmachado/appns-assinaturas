require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

class CustomerService {
    constructor() {
        // Constantes para grupos de cliente
        this.SELLER_GROUP = 'SELLERS';
        this.SHOPPER_GROUP = 'SHOPPERS';
    }

    /**
     * Cria ou atualiza um cliente no Asaas
     * @param {Object} customerData - Dados do cliente
     * @param {string} groupName - Nome do grupo de clientes
     * @returns {Object} - Resultado da operação
     */
    async createOrUpdate(customerData, groupName = '') {
        try {
            // Verificar se o cliente já existe pelo CPF/CNPJ
            if (customerData.cpfCnpj) {
                const existingCustomer = await this.findByCpfCnpj(customerData.cpfCnpj, groupName);
                
                if (existingCustomer.success && existingCustomer.data) {
                    // Cliente existe, atualizar
                    console.log(`Cliente com CPF/CNPJ ${customerData.cpfCnpj} encontrado no Asaas. Atualizando...`);
                    
                    // Adiciona groupName se fornecido
                    if (groupName) {
                        customerData.groupName = groupName;
                    }
                    
                    return await this.update(existingCustomer.data.id, customerData);
                }
            }
            
            // Cliente não existe, criar novo
            // Adiciona groupName se fornecido
            if (groupName) {
                customerData.groupName = groupName;
            }
            
            return await this.create(customerData);
        } catch (error) {
            console.error('Erro ao criar ou atualizar cliente no Asaas:', error);
            return formatError(error);
        }
    }

    /**
     * Cria um cliente no Asaas
     * @param {Object} customerData - Dados do cliente
     * @returns {Object} - Resultado da operação
     */
    async create(customerData) {
        try {
            // Validações básicas
            if (!customerData.name) {
                return createError('Nome do cliente é obrigatório', 400);
            }

            // Limpar e validar o nome
            let cleanName = String(customerData.name).trim();
            
            // Se o nome for um objeto, tentar extrair o valor
            if (typeof customerData.name === 'object') {
                cleanName = customerData.name.pt || customerData.name.name || 'Cliente';
            }
            
            // Remover caracteres especiais que podem causar problemas
            cleanName = cleanName.replace(/[^\w\s\-\.]/g, '').trim();
            
            // Garantir que o nome tenha pelo menos 2 caracteres
            if (cleanName.length < 2) {
                cleanName = 'Cliente Sem Nome';
            }
            
            // Atualizar o customerData com o nome limpo
            customerData = {
                ...customerData,
                name: cleanName
            };

            console.log('DEBUG - Customer data após limpeza:', JSON.stringify(customerData, null, 2));
            
            if (!customerData.cpfCnpj) {
                return createError('CPF/CNPJ do cliente é obrigatório', 400);
            }

            // Validar se o CPF/CNPJ tem formato válido
            const cleanCpfCnpj = customerData.cpfCnpj.replace(/\D/g, '');
            if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
                return createError('CPF/CNPJ deve ter 11 ou 14 dígitos', 400);
            }

            // Atualizar customerData com CPF/CNPJ limpo
            customerData = {
                ...customerData,
                cpfCnpj: cleanCpfCnpj
            };
            
            // Criar cliente no Asaas
            const customer = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'customers',
                data: customerData
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error('Erro ao criar cliente no Asaas:', error);
            return formatError(error);
        }
    }

    /**
     * Atualiza um cliente no Asaas
     * @param {string} id - ID do cliente no Asaas
     * @param {Object} customerData - Dados do cliente
     * @returns {Object} - Resultado da operação
     */
    async update(id, customerData) {
        try {
            if (!id) {
                return createError('ID do cliente é obrigatório', 400);
            }
            // Sanitizar cpfCnpj e inferir personType se aplicável
            if (customerData && customerData.cpfCnpj) {
                const cleanCpfCnpj = String(customerData.cpfCnpj).replace(/\D/g, '');
                customerData = {
                    ...customerData,
                    cpfCnpj: cleanCpfCnpj
                };
                if (!customerData.personType) {
                    if (cleanCpfCnpj.length === 11) customerData.personType = 'FISICA';
                    if (cleanCpfCnpj.length === 14) customerData.personType = 'JURIDICA';
                }
            }
            
            // Atualizar cliente no Asaas
            const customer = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `customers/${id}`,
                data: customerData
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error(`Erro ao atualizar cliente ${id} no Asaas:`, error);
            return formatError(error);
        }
    }

    /**
     * Busca um cliente pelo CPF/CNPJ no Asaas
     * @param {string} cpfCnpj - CPF ou CNPJ do cliente
     * @param {string} groupName - Nome do grupo de clientes
     * @returns {Object} - Resultado da operação
     */
    async findByCpfCnpj(cpfCnpj, groupName = '') {
        try {
            if (!cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório', 400);
            }
            
            // Remover caracteres não numéricos do CPF/CNPJ
            const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
            
            // Parâmetros de busca
            const params = new URLSearchParams();
            params.append('cpfCnpj', cleanCpfCnpj);
            
            // Adicionar grupo se fornecido
            if (groupName) {
                params.append('groupName', groupName);
            }
            
            // Buscar clientes no Asaas
            const customers = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });
            
            if (customers.data && customers.data.length > 0) {
                return { success: true, data: customers.data[0] };
            }
            
            return { success: false, message: `Nenhum cliente encontrado com CPF/CNPJ ${cpfCnpj}` };
        } catch (error) {
            console.error(`Erro ao buscar cliente por CPF/CNPJ ${cpfCnpj} no Asaas:`, error);
            return formatError(error);
        }
    }

    /**
     * Obtém um cliente pelo ID no Asaas
     * @param {string} id - ID do cliente no Asaas
     * @returns {Object} - Resultado da operação
     */
    async get(id) {
        try {
            if (!id) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            // Buscar cliente no Asaas
            const customer = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `customers/${id}`
            });
            
            return { success: true, data: customer };
        } catch (error) {
            console.error(`Erro ao buscar cliente ${id} no Asaas:`, error);
            return formatError(error);
        }
    }

    /**
     * Lista todos os clientes no Asaas
     * @param {Object} filters - Filtros para a listagem
     * @returns {Object} - Resultado da operação
     */
    async getAll(filters = {}) {
        try {
            // Parâmetros de busca
            const params = new URLSearchParams();
            
            // Adicionar filtros
            if (filters.name) params.append('name', filters.name);
            if (filters.email) params.append('email', filters.email);
            if (filters.cpfCnpj) params.append('cpfCnpj', filters.cpfCnpj);
            if (filters.groupName) params.append('groupName', filters.groupName);
            if (filters.externalReference) params.append('externalReference', filters.externalReference);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.limit) params.append('limit', filters.limit);
            
            // Buscar clientes no Asaas
            const customers = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });
            
            return { success: true, data: customers };
        } catch (error) {
            console.error('Erro ao listar clientes no Asaas:', error);
            return formatError(error);
        }
    }

    /**
     * Exclui um cliente no Asaas
     * @param {string} id - ID do cliente no Asaas
     * @returns {Object} - Resultado da operação
     */
    async delete(id) {
        try {
            if (!id) {
                return createError('ID do cliente é obrigatório', 400);
            }
            
            // Excluir cliente no Asaas
            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `customers/${id}`
            });
            
            return { success: true, message: 'Cliente excluído com sucesso' };
        } catch (error) {
            console.error(`Erro ao excluir cliente ${id} no Asaas:`, error);
            return formatError(error);
        }
    }

    /**
     * Lista clientes por grupo
     * @param {string} groupName - Nome do grupo de clientes
     * @param {Object} filters - Filtros adicionais
     * @returns {Object} - Resultado da operação
     */
    async listByGroup(groupName, filters = {}) {
        try {
            if (!groupName) {
                return createError('Nome do grupo é obrigatório', 400);
            }
            
            // Combinar filtros existentes com o groupName
            const combinedFilters = {
                ...filters,
                groupName
            };
            
            // Usar o método getAll com o filtro de grupo
            return await this.getAll(combinedFilters);
        } catch (error) {
            console.error(`Erro ao listar clientes do grupo ${groupName} no Asaas:`, error);
            return formatError(error);
        }
    }

    /**
     * Busca um cliente pela referência externa no Asaas
     * @param {string} externalReference - Referência externa do cliente
     * @param {string} groupName - Nome do grupo de clientes
     * @returns {Object} - Resultado da operação
     */
    async findByExternalReference(externalReference, groupName = '') {
        try {
            if (!externalReference) {
                return createError('Referência externa é obrigatória', 400);
            }
            
            // Parâmetros de busca
            const filters = {
                externalReference
            };
            
            // Adicionar grupo se fornecido
            if (groupName) {
                filters.groupName = groupName;
            }
            
            // Usar o método getAll com o filtro de referência externa
            const result = await this.getAll(filters);
            
            if (result.success && result.data && result.data.data && result.data.data.length > 0) {
                return { success: true, data: result.data.data[0] };
            }
            
            return { 
                success: false, 
                message: `Nenhum cliente encontrado com referência externa ${externalReference}`,
                status: 404
            };
        } catch (error) {
            console.error(`Erro ao buscar cliente por referência externa ${externalReference} no Asaas:`, error);
            return formatError(error);
        }
    }
}

module.exports = new CustomerService();
