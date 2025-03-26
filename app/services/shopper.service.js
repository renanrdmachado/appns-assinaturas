const Shopper = require('../models/Shopper');
const { formatError } = require('../utils/errorHandler');
const ShopperValidator = require('../validators/shopper-validator');
const Order = require('../models/Order');
const AsaasCustomerService = require('./asaas/customer.service');

class ShopperService {
    async get(id) {
        try {
            // Validação do ID movida para o validator
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            
            console.log("Service / Shopper: ", shopper);
            
            if (!shopper) {
                return { 
                    success: false, 
                    message: `Comprador com ID ${id} não encontrado`, 
                    status: 404 
                };
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao buscar comprador:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const shoppers = await Shopper.findAll();
            
            console.log("Service / All Shoppers count: ", shoppers.length);
            return { success: true, data: shoppers };
        } catch (error) {
            console.error('Erro ao buscar compradores:', error.message);
            return formatError(error);
        }
    }
    
    async getByNuvemshopId(nuvemshopId) {
        try {
            // Validação do nuvemshop_id movida para o validator
            ShopperValidator.validateNuvemshopId(nuvemshopId);
            
            const shopper = await Shopper.findOne({
                where: { nuvemshop_id: nuvemshopId },
                include: [{ association: 'orders' }]
            });
            
            console.log(`Service / Shopper by nuvemshop ID ${nuvemshopId}: `, shopper ? 'found' : 'not found');
            
            if (!shopper) {
                return { 
                    success: false, 
                    message: `Comprador com nuvemshop_id ${nuvemshopId} não encontrado`, 
                    status: 404 
                };
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error(`Erro ao buscar comprador por nuvemshop_id ${nuvemshopId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Cria um comprador somente após sincronização bem-sucedida com o Asaas
     * e verifica duplicidade tanto no banco quanto no Asaas
     */
    async create(data) {
        console.log('Shopper - creating...');
        try {
            // Validação completa dos dados no validator
            ShopperValidator.validateShopperData(data);
            
            // 1. Verificar se já existe um comprador com este nuvemshop_id no banco local
            const existingShopper = await Shopper.findOne({ where: { nuvemshop_id: data.nuvemshop_id } });
            if (existingShopper) {
                return { 
                    success: false, 
                    message: 'Já existe um comprador com este ID da Nuvemshop',
                    status: 400
                };
            }

            // 2. Verificar se já existe um comprador com este CPF/CNPJ no banco local
            const shopperWithSameCpfCnpj = await Shopper.findOne({ where: { cpfCnpj: data.cpfCnpj } });
            if (shopperWithSameCpfCnpj) {
                return {
                    success: false,
                    message: `Já existe um comprador com o CPF/CNPJ ${data.cpfCnpj} cadastrado (ID: ${shopperWithSameCpfCnpj.id})`,
                    status: 400
                };
            }

            // Verificar se temos CPF/CNPJ para a sincronização com o Asaas
            if (!data.cpfCnpj) {
                return {
                    success: false,
                    message: 'CPF/CNPJ é obrigatório para criar um comprador',
                    status: 400
                };
            }

            // 3. Verificar se já existe um cliente com este CPF/CNPJ no Asaas
            console.log(`Verificando se já existe cliente com CPF/CNPJ ${data.cpfCnpj} no Asaas...`);
            const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(data.cpfCnpj, AsaasCustomerService.SHOPPER_GROUP);
            
            let asaasCustomerId;
            
            if (existingAsaasCustomer.success) {
                // Se já existe cliente no Asaas, usamos o ID existente
                console.log(`Cliente já existe no Asaas com ID: ${existingAsaasCustomer.data.id}`);
                asaasCustomerId = existingAsaasCustomer.data.id;
                
                // Verificar se há um comprador vinculado a este ID do Asaas
                const shopperWithAsaasId = await Shopper.findOne({ 
                    where: { payments_customer_id: asaasCustomerId } 
                });
                
                if (shopperWithAsaasId) {
                    return {
                        success: false,
                        message: `Já existe um comprador (ID: ${shopperWithAsaasId.id}) vinculado a este cliente do Asaas`,
                        status: 400
                    };
                }
                
                // Se chegou aqui, podemos usar o cliente existente no Asaas
            } else {
                // Se não existe, criar novo cliente no Asaas
                // Mapear dados para o formato do Asaas
                const customerData = {
                    name: data.name,
                    cpfCnpj: data.cpfCnpj,
                    email: data.email || undefined,
                    mobilePhone: data.mobilePhone || undefined,
                    address: data.address || undefined,
                    addressNumber: data.addressNumber || undefined,
                    province: data.province || undefined,
                    postalCode: data.postalCode || undefined,
                    externalReference: data.nuvemshop_id.toString(),
                    groupName: AsaasCustomerService.SHOPPER_GROUP,
                    observations: `Comprador da Nuvemshop ID: ${data.nuvemshop_id}`,
                    notificationDisabled: false
                };
                
                console.log('Criando novo cliente no Asaas...');
                
                // Tentar criar cliente no Asaas
                const asaasResult = await AsaasCustomerService.createOrUpdate(
                    customerData, 
                    AsaasCustomerService.SHOPPER_GROUP
                );
                
                // Se falhar no Asaas, não cria no banco local
                if (!asaasResult.success) {
                    console.error('Falha ao criar cliente no Asaas:', asaasResult.message);
                    return {
                        success: false,
                        message: `Falha ao sincronizar com Asaas: ${asaasResult.message}`,
                        status: asaasResult.status || 400
                    };
                }
                
                console.log('Cliente criado com sucesso no Asaas, ID:', asaasResult.data.id);
                asaasCustomerId = asaasResult.data.id;
            }
            
            // 4. Adicionar ID do cliente Asaas nos dados e criar no banco local
            data.payments_customer_id = asaasCustomerId;
            
            // Criar o shopper no banco de dados local
            const shopper = await Shopper.create(data);
            console.log('Shopper created com Asaas sync:', shopper.id);
            
            return { 
                success: true, 
                message: 'Comprador criado e sincronizado com Asaas com sucesso',
                data: shopper
            };
        } catch (error) {
            console.error('Erro ao criar comprador:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Atualiza um comprador somente após sincronização bem-sucedida com o Asaas
     */
    async update(id, data) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return { 
                    success: false, 
                    message: `Comprador com ID ${id} não encontrado`,
                    status: 404
                };
            }
            
            // Validação dos dados de atualização
            ShopperValidator.validateShopperUpdateData(data);
            
            // Verificar se há dados relevantes para o Asaas
            const asaasRelevantFields = ['name', 'cpfCnpj', 'email', 'mobilePhone', 'address', 
                                    'addressNumber', 'province', 'postalCode'];
        
            const needsAsaasSync = asaasRelevantFields.some(field => data[field] !== undefined);
            
            // Se precisamos sincronizar com o Asaas
            if (needsAsaasSync) {
                // Obter CPF/CNPJ atual ou atualizado
                const cpfCnpj = data.cpfCnpj || shopper.cpfCnpj;
                
                if (!cpfCnpj) {
                    return {
                        success: false,
                        message: 'CPF/CNPJ é obrigatório para sincronizar com o Asaas',
                        status: 400
                    };
                }
                
                // Mapear dados para o Asaas
                const mergedData = { ...shopper.toJSON(), ...data };
                
                const customerData = {
                    name: mergedData.name,
                    cpfCnpj: mergedData.cpfCnpj,
                    email: mergedData.email || undefined,
                    mobilePhone: mergedData.mobilePhone || undefined,
                    address: mergedData.address || undefined,
                    addressNumber: mergedData.addressNumber || undefined,
                    province: mergedData.province || undefined,
                    postalCode: mergedData.postalCode || undefined,
                    externalReference: mergedData.nuvemshop_id.toString(),
                    groupName: AsaasCustomerService.SHOPPER_GROUP,
                    observations: `Comprador da Nuvemshop ID: ${mergedData.nuvemshop_id}`,
                    notificationDisabled: false
                };
                
                console.log('Sincronizando dados atualizados com Asaas antes de salvar no banco...');
                
                // Primeiro tentar sincronizar com o Asaas
                const asaasResult = await AsaasCustomerService.createOrUpdate(
                    customerData, 
                    AsaasCustomerService.SHOPPER_GROUP
                );
                
                // Se falhar no Asaas, não atualiza no banco local
                if (!asaasResult.success) {
                    console.error('Falha ao atualizar no Asaas:', asaasResult.message);
                    return {
                        success: false,
                        message: `Falha ao sincronizar com Asaas: ${asaasResult.message}`,
                        status: asaasResult.status || 400
                    };
                }
                
                console.log('Cliente atualizado com sucesso no Asaas, ID:', asaasResult.data.id);
                
                // Atualizar o payments_customer_id se necessário
                if (asaasResult.data.id && (!shopper.payments_customer_id || shopper.payments_customer_id !== asaasResult.data.id)) {
                    data.payments_customer_id = asaasResult.data.id;
                }
            }
            
            // Atualizar o shopper no banco de dados local
            await shopper.update(data);
            await shopper.reload();
            
            console.log('Shopper updated:', shopper.id);
            
            return { 
                success: true, 
                message: needsAsaasSync ? 
                    'Comprador atualizado e sincronizado com Asaas com sucesso' : 
                    'Comprador atualizado com sucesso',
                data: shopper
            };
        } catch (error) {
            console.error('Erro ao atualizar comprador:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return { 
                    success: false, 
                    message: `Comprador com ID ${id} não encontrado`,
                    status: 404
                };
            }
            
            // Verificar se há pedidos associados a este comprador
            const orders = await Order.findAll({
                where: { shopper_id: id.toString() }
            });
            
            if (orders.length > 0) {
                return { 
                    success: false, 
                    message: 'Não é possível remover um comprador com pedidos associados',
                    status: 400
                };
            }
            
            await shopper.destroy();
            console.log(`Comprador com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Comprador com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir comprador:', error.message);
            return formatError(error);
        }
    }

    /**
     * Sincroniza um comprador com o Asaas
     * @param {string} id - ID do comprador
     * @returns {Promise<Object>} - Resultado da operação
     */
    async syncWithAsaas(id) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id);
            
            if (!shopper) {
                return { 
                    success: false, 
                    message: `Comprador com ID ${id} não encontrado`, 
                    status: 404 
                };
            }
            
            // Valida se tem informações mínimas necessárias
            if (!shopper.cpfCnpj) {
                return { 
                    success: false, 
                    message: 'CPF/CNPJ é obrigatório para sincronizar com Asaas',
                    status: 400 
                };
            }
            
            // Mapeia dados do shopper para o formato do Asaas
            const customerData = this._mapToAsaasCustomer(shopper);
            
            // Cria ou atualiza o cliente no Asaas
            const result = await AsaasCustomerService.createOrUpdate(
                customerData, 
                AsaasCustomerService.SHOPPER_GROUP
            );
            
            if (result.success) {
                // Atualiza o ID do customer no shopper se necessário
                if (!shopper.payments_customer_id || shopper.payments_customer_id !== result.data.id) {
                    await shopper.update({ payments_customer_id: result.data.id });
                }
                
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
                    'Comprador sincronizado com sucesso no Asaas' : 
                    result.message
            };
        } catch (error) {
            console.error('Erro ao sincronizar comprador com Asaas:', error.message);
            return formatError(error);
        }
    }

    /**
     * Método auxiliar para mapear os dados do Shopper para o formato do Customer do Asaas
     * @private
     * @param {Object} shopper - Objeto do modelo Shopper
     * @returns {Object} - Dados no formato esperado pelo Asaas
     */
    _mapToAsaasCustomer(shopper) {
        // Extrair info do nuvemshop_info se existir
        const shopperInfo = typeof shopper.nuvemshop_info === 'string' 
            ? JSON.parse(shopper.nuvemshop_info) 
            : shopper.nuvemshop_info || {};
        
        // Montar objeto com os dados do Asaas
        return {
            name: shopper.name || shopperInfo.name || 'Cliente ' + shopper.nuvemshop_id,
            cpfCnpj: shopper.cpfCnpj,
            email: shopper.email || shopperInfo.email,
            mobilePhone: shopper.mobilePhone,
            address: shopper.address,
            addressNumber: shopper.addressNumber,
            province: shopper.province,
            postalCode: shopper.postalCode,
            externalReference: shopper.nuvemshop_id.toString(),
            groupName: AsaasCustomerService.SHOPPER_GROUP,
            observations: `Comprador da Nuvemshop ID: ${shopper.nuvemshop_id}`,
            notificationDisabled: false
        };
    }
}

module.exports = new ShopperService();
