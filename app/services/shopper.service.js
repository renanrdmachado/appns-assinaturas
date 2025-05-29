const Shopper = require('../models/Shopper');
const User = require('../models/User');
const UserData = require('../models/UserData');
const Seller = require('../models/Seller'); // Adicionando importação do Seller
const ShopperSubscription = require('../models/ShopperSubscription'); // Adicionando importação
const { formatError, createError } = require('../utils/errorHandler');
const AsaasCustomerService = require('./asaas/customer.service');
const ShopperValidator = require('../validators/shopper-validator');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const AsaasMapper = require('../utils/asaas-mapper');

class ShopperService {
    /**
     * Obtém um shopper pelo ID
     * @param {number} id - ID do shopper
     */
    async get(id) {
        try {
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
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

            // Formatação dos dados
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se já existe um UserData com este CPF/CNPJ
            let userData = await UserData.findOne({ where: { cpfCnpj: data.cpfCnpj } });
            
            // Sincronizar com o Asaas antes de criar no banco local
            let asaasCustomerId = null;
            if (data.cpfCnpj) {
                // Verificar se já existe um cliente com este CPF/CNPJ no Asaas
                console.log(`Verificando se já existe cliente com CPF/CNPJ ${data.cpfCnpj} no Asaas...`);
                const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(
                    data.cpfCnpj, 
                    AsaasCustomerService.SHOPPER_GROUP
                );
                
                if (existingAsaasCustomer.success) {
                    // Se já existe cliente no Asaas, usamos o ID existente
                    console.log(`Cliente já existe no Asaas com ID: ${existingAsaasCustomer.data.id}`);
                    asaasCustomerId = existingAsaasCustomer.data.id;
                    
                    // Verificar se há um shopper vinculado a este ID do Asaas
                    const shopperWithAsaasId = await Shopper.findOne({ 
                        where: { payments_customer_id: asaasCustomerId },
                        include: [
                            { 
                                model: User, 
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }] 
                            }
                        ]
                    });
                    
                    if (shopperWithAsaasId) {
                        // Em vez de retornar erro, retorna o shopper existente com um status de "ALREADY_EXISTS"
                        console.log('Shopper já existe com este cliente Asaas:', shopperWithAsaasId.id);
                        return { 
                            success: true, 
                            alreadyExists: true,
                            message: 'Já existe um shopper vinculado a este cliente do Asaas',
                            data: shopperWithAsaasId
                        };
                    }
                } else {
                    // Se não existe, criar novo cliente no Asaas
                    const customerData = this._mapToAsaasCustomer(data);
                    
                    // Tentar criar cliente no Asaas
                    const asaasResult = await AsaasCustomerService.createOrUpdate(
                        customerData,
                        AsaasCustomerService.SHOPPER_GROUP
                    );
                    
                    // Se falhar no Asaas, não cria no banco local
                    if (!asaasResult.success) {
                        return createError(`Falha ao sincronizar com Asaas: ${asaasResult.message}`, 400);
                    }
                    
                    asaasCustomerId = asaasResult.data.id;
                }
                
                data.payments_customer_id = asaasCustomerId;
            }

            // Usar transação para garantir consistência
            const result = await sequelize.transaction(async (t) => {
                // Criar ou usar UserData existente
                if (!userData && data.cpfCnpj) {
                    userData = await UserData.create({
                        cpfCnpj: data.cpfCnpj,
                        email: data.email,
                        mobilePhone: data.mobilePhone,
                        address: data.address,
                        addressNumber: data.addressNumber,
                        province: data.province,
                        postalCode: data.postalCode,
                        birthDate: data.birthDate
                    }, { transaction: t });
                }
                
                // Criar User vinculado ao UserData
                const user = await User.create({
                    username: data.username || null,
                    email: data.email,
                    password: data.password || null,
                    user_data_id: userData?.id
                }, { transaction: t });
                
                // Criar Shopper vinculado ao User
                const shopper = await Shopper.create({
                    nuvemshop_id: data.nuvemshop_id || null,
                    nuvemshop_info: data.nuvemshop_info || null,
                    name: data.name,
                    email: data.email,
                    user_id: user.id,
                    payments_customer_id: data.payments_customer_id,
                    payments_status: data.payments_status || "PENDING"
                }, { transaction: t });
                
                return shopper;
            });
            
            // Carregar o shopper com as relações
            const shopperWithRelations = await Shopper.findByPk(result.id, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            console.log('Shopper created:', shopperWithRelations.id);
            
            return { 
                success: true, 
                message: 'Shopper criado com sucesso',
                data: shopperWithRelations
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
            
            // Buscar o shopper com suas relações
            const shopper = await Shopper.findByPk(id, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            // Validação dos dados de atualização
            ShopperValidator.validateShopperUpdateData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se há dados que precisam ser sincronizados com o Asaas
            const needsAsaasSync = data.cpfCnpj || data.email || data.mobilePhone || 
                                data.address || data.addressNumber || data.province || 
                                data.postalCode || data.name;
            
            // Se precisamos sincronizar com o Asaas e temos um CPF/CNPJ
            if (needsAsaasSync && (shopper.user?.userData?.cpfCnpj || data.cpfCnpj)) {
                try {
                    // Criar um objeto temporário com os dados atualizados para mapear para o Asaas
                    const tempShopper = JSON.parse(JSON.stringify(shopper));
                    
                    // Atualizar o tempShopper com os novos dados
                    if (data.name) tempShopper.name = data.name;
                    if (data.email) {
                        tempShopper.email = data.email;
                        if (tempShopper.user) tempShopper.user.email = data.email;
                    }
                    
                    // Atualizar o userData no tempShopper
                    if (tempShopper.user && tempShopper.user.userData) {
                        if (data.cpfCnpj) tempShopper.user.userData.cpfCnpj = data.cpfCnpj;
                        if (data.mobilePhone) tempShopper.user.userData.mobilePhone = data.mobilePhone;
                        if (data.address) tempShopper.user.userData.address = data.address;
                        if (data.addressNumber) tempShopper.user.userData.addressNumber = data.addressNumber;
                        if (data.province) tempShopper.user.userData.province = data.province;
                        if (data.postalCode) tempShopper.user.userData.postalCode = data.postalCode;
                    }
                    
                    // Mapear para o formato do Asaas
                    const customerData = AsaasMapper.mapShopperToCustomer(tempShopper, AsaasCustomerService.SHOPPER_GROUP);
                    
                    console.log('Sincronizando shopper com Asaas...');
                    
                    // Enviar para o Asaas
                    const asaasResult = await AsaasCustomerService.createOrUpdate(
                        customerData,
                        AsaasCustomerService.SHOPPER_GROUP
                    );
                    
                    console.log('Resposta do Asaas:', asaasResult.success ? 'Sucesso' : 'Falha');
                    
                    // Se houve sucesso e o ID do Asaas é diferente, atualizar no shopper
                    if (asaasResult.success && asaasResult.data.id !== shopper.payments_customer_id) {
                        data.payments_customer_id = asaasResult.data.id;
                    }
                } catch (asaasError) {
                    console.error('Erro na sincronização com Asaas:', asaasError.message);
                    // Não bloqueia a atualização local se falhar no Asaas
                }
            }
            
            // Usar transação para garantir atomicidade da atualização no banco de dados
            return await sequelize.transaction(async (t) => {
                // 1. Atualizar UserData
                if (shopper.user && shopper.user.userData) {
                    if (data.cpfCnpj || data.mobilePhone || data.address || 
                        data.addressNumber || data.province || data.postalCode || 
                        data.birthDate) {
                        
                        await shopper.user.userData.update({
                            cpfCnpj: data.cpfCnpj || shopper.user.userData.cpfCnpj,
                            mobilePhone: data.mobilePhone || shopper.user.userData.mobilePhone,
                            address: data.address || shopper.user.userData.address,
                            addressNumber: data.addressNumber || shopper.user.userData.addressNumber,
                            province: data.province || shopper.user.userData.province,
                            postalCode: data.postalCode || shopper.user.userData.postalCode,
                            birthDate: data.birthDate || shopper.user.userData.birthDate
                        }, { transaction: t });
                    }
                }
                
                // 2. Atualizar User
                if (shopper.user && (data.email || data.username)) {
                    await shopper.user.update({
                        email: data.email || shopper.user.email,
                        username: data.username || shopper.user.username
                    }, { transaction: t });
                }
                
                // 3. Atualizar Shopper
                await shopper.update({
                    name: data.name !== undefined ? data.name : shopper.name,
                    email: data.email || shopper.email,
                    nuvemshop_info: data.nuvemshop_info || shopper.nuvemshop_info,
                    payments_status: data.payments_status || shopper.payments_status,
                    payments_customer_id: data.payments_customer_id || shopper.payments_customer_id
                }, { transaction: t });
                
                // Recarregar o shopper com as relações atualizadas
                await shopper.reload({
                    include: [
                        { 
                            model: User, 
                            as: 'user',
                            include: [{ model: UserData, as: 'userData' }] 
                        }
                    ]
                });
                
                return { 
                    success: true, 
                    message: 'Shopper atualizado com sucesso',
                    data: shopper
                };
            });
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
            // Validação do ID
            ShopperValidator.validateId(id);
            
            const shopper = await Shopper.findByPk(id, {
                include: [{ model: User, as: 'user' }]
            });
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            // Verificar se o shopper possui assinaturas antes de tentar excluí-lo
            const subscriptionCount = await ShopperSubscription.count({
                where: { shopper_id: id }
            });
            
            if (subscriptionCount > 0) {
                return createError(
                    `Não é possível excluir o cliente pois ele possui ${subscriptionCount} assinatura(s) ativa(s). Cancele todas as assinaturas antes de excluir o cliente.`, 
                    400
                );
            }
            
            const userId = shopper.user?.id;
            const userDataId = shopper.user?.user_data_id;
            
            try {
                // Usar transação para garantir atomicidade
                await sequelize.transaction(async (t) => {
                    // 1. Excluir o shopper
                    await shopper.destroy({ transaction: t });
                    
                    // 2. Se tiver usuário, verificar se pode excluí-lo
                    if (userId) {
                        // Verificar se o usuário está associado a outro shopper ou seller
                        const shopperCount = await Shopper.count({ 
                            where: { user_id: userId }, 
                            transaction: t 
                        });
                        
                        const sellerCount = await Seller.count({ 
                            where: { user_id: userId }, 
                            transaction: t 
                        });
                        
                        // Se não estiver associado a outros registros, excluir o usuário
                        if (shopperCount === 0 && sellerCount === 0) {
                            const user = await User.findByPk(userId, { transaction: t });
                            if (user) {
                                await user.destroy({ transaction: t });
                                
                                // 3. Se tiver userData, verificar se pode excluí-lo
                                if (userDataId) {
                                    // Verificar se o userData está associado a outros usuários
                                    const otherUsers = await User.count({
                                        where: { 
                                            user_data_id: userDataId,
                                            id: { [Op.ne]: userId }
                                        },
                                        transaction: t
                                    });
                                    
                                    // Se não estiver associado a outros usuários, excluir o userData
                                    if (otherUsers === 0) {
                                        const userData = await UserData.findByPk(userDataId, { transaction: t });
                                        if (userData) {
                                            await userData.destroy({ transaction: t });
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                
                return { 
                    success: true, 
                    message: `Cliente excluído com sucesso` 
                };
            } catch (dbError) {
                // Trata especificamente erros de chave estrangeira
                if (dbError.name === 'SequelizeForeignKeyConstraintError') {
                    return createError(
                        `Não é possível excluir o cliente pois ele está vinculado a outros registros no sistema. Cancele todas as assinaturas antes de excluir o cliente.`,
                        400
                    );
                }
                throw dbError; // Lança outros erros para serem tratados no catch externo
            }
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
            const shopper = await Shopper.findByPk(id, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            if (!shopper) {
                return createError(`Shopper com ID ${id} não encontrado`, 404);
            }
            
            if (!shopper.user?.userData?.cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório para sincronizar com Asaas', 400);
            }
            
            // Usar o mapeador para criar os dados no formato do Asaas
            const customerData = AsaasMapper.mapShopperToCustomer(shopper, AsaasCustomerService.SHOPPER_GROUP);
            
            // Cria ou atualiza o cliente no Asaas
            const result = await AsaasCustomerService.createOrUpdate(
                customerData,
                AsaasCustomerService.SHOPPER_GROUP
            );
            
            if (result.success) {
                // Atualiza o payments_customer_id no shopper
                await shopper.update({ 
                    payments_customer_id: result.data.id 
                });
                
                // Recarregar o shopper para ter os dados atualizados
                await shopper.reload();
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
    
    /**
     * Obtém um shopper pelo email
     * @param {string} email - Email do shopper
     */
    async getByEmail(email) {
        try {
            if (!email) {
                return createError('Email é obrigatório', 400);
            }
            
            const shopper = await Shopper.findOne({
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        where: { email: email },
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            if (!shopper) {
                return createError(`Shopper com email ${email} não encontrado`, 404);
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao buscar shopper por email:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Obtém um shopper pelo CPF/CNPJ
     * @param {string} cpfCnpj - CPF ou CNPJ do shopper
     */
    async getByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório', 400);
            }
            
            const shopper = await Shopper.findOne({
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ 
                            model: UserData, 
                            as: 'userData',
                            where: { cpfCnpj: cpfCnpj }
                        }] 
                    }
                ]
            });
            
            if (!shopper) {
                return createError(`Shopper com CPF/CNPJ ${cpfCnpj} não encontrado`, 404);
            }
            
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao buscar shopper por CPF/CNPJ:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new ShopperService();
