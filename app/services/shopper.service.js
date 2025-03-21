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
     * Atualização do método create para sincronizar com o Asaas
     */
    async create(data) {
        console.log('Shopper - creating...');
        try {
            // Validação completa dos dados no validator
            ShopperValidator.validateShopperData(data);
            
            // Verificar se já existe um comprador com este nuvemshop_id
            const existingShopper = await Shopper.findOne({ where: { nuvemshop_id: data.nuvemshop_id } });
            if (existingShopper) {
                return { 
                    success: false, 
                    message: 'Já existe um comprador com este ID',
                    status: 400
                };
            }
            
            // Criar o shopper no banco de dados local
            const shopper = await Shopper.create(data);
            console.log('Shopper created:', shopper.id);
            
            // Se tiver CPF/CNPJ, tentar sincronizar com o Asaas
            let asaasSync = { success: false, message: 'Sincronização com Asaas não realizada' };
            if (data.cpfCnpj) {
                try {
                    asaasSync = await this.syncWithAsaas(shopper.id);
                } catch (asaasError) {
                    console.error('Erro ao sincronizar com Asaas durante criação:', asaasError.message);
                    asaasSync = { 
                        success: false, 
                        message: 'Erro ao sincronizar com Asaas: ' + asaasError.message 
                    };
                    // Não impede a criação do shopper se a sincronização falhar
                }
            }
            
            return { 
                success: true, 
                data: shopper,
                asaasSync
            };
        } catch (error) {
            console.error('Erro ao criar comprador:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Atualização do método update para sincronizar com o Asaas
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
            
            // Atualizar o shopper no banco de dados local
            await shopper.update(data);
            console.log('Shopper updated:', shopper.id);
            
            // Se tiver CPF/CNPJ, tentar sincronizar com o Asaas
            let asaasSync = { success: false, message: 'Sincronização com Asaas não realizada' };
            if (shopper.cpfCnpj || data.cpfCnpj) {
                try {
                    asaasSync = await this.syncWithAsaas(shopper.id);
                } catch (asaasError) {
                    console.error('Erro ao sincronizar com Asaas durante atualização:', asaasError.message);
                    asaasSync = { 
                        success: false, 
                        message: 'Erro ao sincronizar com Asaas: ' + asaasError.message 
                    };
                    // Não impede a atualização do shopper se a sincronização falhar
                }
            }
            
            return { 
                success: true, 
                data: shopper,
                asaasSync
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
