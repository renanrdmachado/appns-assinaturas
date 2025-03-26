const Shopper = require('../models/Shopper');
const { formatError, createError } = require('../utils/errorHandler');
const AsaasCustomerService = require('./asaas/customer.service');
const ShopperValidator = require('../validators/shopper-validator');

class ShopperService {
    /**
     * Obtém um shopper pelo ID
     * @param {number} id - ID do shopper
     */
    async get(id) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            console.log("Service / Shopper: ", shopper ? shopper.id : 'not found');
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao buscar shopper:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Obtém um shopper pelo ID da Nuvemshop
     * @param {string} nuvemshopId - ID da Nuvemshop
     */
    async getByNuvemshopId(nuvemshopId) {
        try {
            // Validação do nuvemshop_id
            ShopperValidator.validateNuvemshopId(nuvemshopId);
            
            const shopper = await Shopper.findOne({
                where: { nuvemshop_id: nuvemshopId }
            });
            
            console.log("Service / Shopper by nuvemshop_id: ", shopper ? shopper.id : 'not found');
            
            if (!shopper) {
                return createError(`Shopper com Nuvemshop ID ${nuvemshopId} não encontrado`, 404);
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao buscar shopper por nuvemshop_id:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Lista todos os shoppers
     */
    async getAll() {
        try {
            const shoppers = await Shopper.findAll();
            console.log("Service / All Shoppers count: ", shoppers.length);
            return { success: true, data: shoppers };
        } catch (error) {
            console.error('Erro ao buscar shoppers:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Cria um shopper
     * @param {Object} data - Dados do shopper
     */
    async create(data) {
        console.log("Shopper - creating...");
        
        try {
            // Validação dos dados
            ShopperValidator.validateShopperData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se já existe um shopper com este nuvemshop_id
            const existingShopper = await Shopper.findOne({ 
                where: { nuvemshop_id: data.nuvemshop_id } 
            });
            
            if (existingShopper) {
                return createError('Já existe um shopper com este ID da Nuvemshop', 400);
            }
            
            // Sincronizar com o Asaas, se tiver dados suficientes
            if (data.cpfCnpj) {
                // Verificar se já existe um cliente com este CPF/CNPJ no Asaas
                console.log(`Verificando se já existe cliente com CPF/CNPJ ${data.cpfCnpj} no Asaas...`);
                const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(
                    data.cpfCnpj, 
                    AsaasCustomerService.SHOPPER_GROUP
                );
                
                let asaasCustomerId;
                
                if (existingAsaasCustomer.success) {
                    // Se já existe cliente no Asaas, usamos o ID existente
                    console.log(`Cliente já existe no Asaas com ID: ${existingAsaasCustomer.data.id}`);
                    asaasCustomerId = existingAsaasCustomer.data.id;
                } else {
                    // Se não existe, criar novo cliente no Asaas
                    const customerData = this._mapToAsaasCustomer(data);
                    
                    console.log('Criando novo cliente no Asaas para shopper...');
                    
                    // Tentar criar cliente no Asaas
                    const asaasResult = await AsaasCustomerService.createOrUpdate(
                        customerData,
                        AsaasCustomerService.SHOPPER_GROUP
                    );
                    
                    // Se falhar no Asaas, não impede criação no banco local
                    if (asaasResult.success) {
                        console.log('Cliente criado com sucesso no Asaas, ID:', asaasResult.data.id);
                        asaasCustomerId = asaasResult.data.id;
                    } else {
                        console.warn('Falha ao criar cliente no Asaas:', asaasResult.message);
                    }
                }
                
                // Adicionar ID do cliente Asaas nos dados se disponível
                if (asaasCustomerId) {
                    data.payments_customer_id = asaasCustomerId;
                }
            }
            
            // Criar o shopper no banco de dados local
            const shopper = await Shopper.create(data);
            console.log('Shopper created:', shopper.id);
            
            return { 
                success: true, 
                message: 'Shopper criado com sucesso',
                data: shopper
            };
        } catch (error) {
            console.error('Erro ao criar shopper:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Atualiza um shopper
     * @param {number} id - ID do shopper
     * @param {Object} data - Dados do shopper para atualização
     */
    async update(id, data) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            // Validação dos dados de atualização
            ShopperValidator.validateShopperUpdateData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se há dados relevantes para o Asaas
            const asaasRelevantFields = ['cpfCnpj', 'email', 'mobilePhone', 
                                        'address', 'addressNumber', 'province', 
                                        'postalCode'];
            
            const needsAsaasSync = asaasRelevantFields.some(field => data[field] !== undefined);
            
            // Se precisamos sincronizar com o Asaas e temos um cliente ID
            if (needsAsaasSync && (shopper.payments_customer_id || data.cpfCnpj)) {
                // Obter CPF/CNPJ atual ou atualizado
                const cpfCnpj = data.cpfCnpj || shopper.cpfCnpj;
                
                if (cpfCnpj) {
                    // Mapear dados para o Asaas
                    const mergedData = { ...shopper.toJSON(), ...data };
                    const customerData = this._mapToAsaasCustomer(mergedData);
                    
                    console.log('Sincronizando dados atualizados com Asaas...');
                    
                    // Tentar sincronizar com o Asaas
                    const asaasResult = await AsaasCustomerService.createOrUpdate(
                        customerData,
                        AsaasCustomerService.SHOPPER_GROUP
                    );
                    
                    // Se falhar no Asaas, não impede atualização no banco local
                    if (asaasResult.success) {
                        console.log('Cliente atualizado com sucesso no Asaas, ID:', asaasResult.data.id);
                        
                        // Atualizar o payments_customer_id se necessário
                        if (asaasResult.data.id && 
                            (!shopper.payments_customer_id || shopper.payments_customer_id !== asaasResult.data.id)) {
                            data.payments_customer_id = asaasResult.data.id;
                        }
                    } else {
                        console.warn('Falha ao atualizar no Asaas:', asaasResult.message);
                    }
                }
            }
            
            // Atualizar o shopper no banco de dados local
            await shopper.update(data);
            await shopper.reload();
            
            console.log('Shopper updated:', shopper.id);
            return { 
                success: true, 
                message: 'Shopper atualizado com sucesso',
                data: shopper
            };
        } catch (error) {
            console.error('Erro ao atualizar shopper:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Remove um shopper
     * @param {number} id - ID do shopper
     */
    async delete(id) {
        try {
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            await shopper.destroy();
            console.log(`Shopper com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Shopper com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir shopper:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Sincroniza um shopper com o Asaas
     * @param {number} id - ID do shopper
     */
    async syncWithAsaas(id) {
        try {
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            // Valida se tem informações mínimas necessárias
            if (!shopper.cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório para sincronizar com Asaas', 400);
            }
            
            // Mapeia dados do shopper para o formato do Asaas
            const customerData = this._mapToAsaasCustomer(shopper);
            
            // Cria ou atualiza o cliente no Asaas
            const result = await AsaasCustomerService.createOrUpdate(
                customerData,
                AsaasCustomerService.SHOPPER_GROUP
            );
            
            if (result.success) {
                // Sempre atualiza o ID do customer no shopper
                await shopper.update({ 
                    payments_customer_id: result.data.id 
                });
                
                // Recarregar o objeto depois da atualização
                await shopper.reload();
                
                console.log(`Shopper ID ${id} atualizado com payments_customer_id: ${result.data.id}`);
            }
            
            return { 
                success: result.success,
                data: {
                    shopper: shopper,
                    asaasCustomer: result.data
                },
                message: result.success ? 
                    'Shopper sincronizado com sucesso no Asaas' : 
                    result.message
            };
        } catch (error) {
            console.error('Erro ao sincronizar shopper com Asaas:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Método auxiliar para mapear dados para o Asaas
     * @private
     */
    _mapToAsaasCustomer(data) {
        return {
            name: data.name || `Shopper ${data.nuvemshop_id}`,
            cpfCnpj: data.cpfCnpj,
            email: data.email,
            mobilePhone: data.mobilePhone,
            address: data.address,
            addressNumber: data.addressNumber,
            province: data.province,
            postalCode: data.postalCode,
            externalReference: data.nuvemshop_id ? data.nuvemshop_id.toString() : undefined,
            groupName: AsaasCustomerService.SHOPPER_GROUP,
            observations: `Shopper da Nuvemshop${data.nuvemshop_id ? ' ID: ' + data.nuvemshop_id : ''}`,
            notificationDisabled: false
        };
    }
}

module.exports = new ShopperService();
