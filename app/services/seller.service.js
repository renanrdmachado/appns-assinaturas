const Seller = require('../models/Seller');
const User = require('../models/User');
const UserData = require('../models/UserData');
const Shopper = require('../models/Shopper'); // Adicionando importação do Shopper
const { createError, formatError } = require('../utils/errorHandler');
const AsaasCustomerService = require('./asaas/customer.service');
const SellerValidator = require('../validators/seller-validator');
const PaymentMethodsValidator = require('../validators/payment-methods-validator');
const AsaasMapper = require('../utils/asaas-mapper');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

class SellerService {
    async get(id) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            const seller = await Seller.findByPk(id);
            console.log("Service / Seller: ", seller);
            
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            return { success: true, data: seller };
        } catch (error) {
            console.error('Erro ao buscar vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async getByNuvemshopId(nuvemshopId) {
        try {
            // Validação do nuvemshop_id
            SellerValidator.validateNuvemshopId(nuvemshopId);
            
            const seller = await Seller.findOne({
                where: { nuvemshop_id: nuvemshopId }
            });
            
            console.log("Service / Seller by nuvemshop_id: ", seller);
            
            if (!seller) {
                return createError(`Vendedor com Nuvemshop ID ${nuvemshopId} não encontrado`, 404);
            }
            
            return { success: true, data: seller };
        } catch (error) {
            console.error('Erro ao buscar vendedor por nuvemshop_id:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const sellers = await Seller.findAll();
            console.log("Service / All Sellers count: ", sellers.length);
            return { success: true, data: sellers };
        } catch (error) {
            console.error('Erro ao buscar vendedores:', error.message);
            return formatError(error);
        }
    }

    /**
     * Cria um vendedor somente após sincronização bem-sucedida com o Asaas
     * e verifica duplicidade tanto no banco quanto no Asaas
     */
    async create(data) {
        console.log("Seller - creating...");
        
        try {
            // Validação dos dados usando o validator
            SellerValidator.validateSellerData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // 1. Verificar se já existe um vendedor com este nuvemshop_id no banco local
            const existingSeller = await Seller.findOne({ where: { nuvemshop_id: data.nuvemshop_id } });
            if (existingSeller) {
                return createError('Já existe um vendedor com este ID da Nuvemshop', 400);
            }
            
            // 2. Verificar se já existe um userData com este cpfCnpj no banco local
            const existingUserData = await UserData.findOne({ where: { cpfCnpj: data.cpfCnpj } });
            if (existingUserData) {
                // Verificar se já existe um User associado a este UserData
                const existingUser = await User.findOne({ where: { user_data_id: existingUserData.id } });
                if (existingUser) {
                    // Verificar se já existe um Seller associado a este User
                    const sellerWithUser = await Seller.findOne({ where: { user_id: existingUser.id } });
                    if (sellerWithUser) {
                        return createError(`Já existe um vendedor associado ao CPF/CNPJ ${data.cpfCnpj}`, 400);
                    }
                }
            }
            
            // 3. Verificar se já existe um cliente com este CPF/CNPJ no Asaas
            console.log(`Verificando se já existe cliente com CPF/CNPJ ${data.cpfCnpj} no Asaas...`);
            const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(data.cpfCnpj, AsaasCustomerService.SELLER_GROUP);
            
            let asaasCustomerId;
            
            if (existingAsaasCustomer.success) {
                // Se já existe cliente no Asaas, usamos o ID existente
                console.log(`Cliente já existe no Asaas com ID: ${existingAsaasCustomer.data.id}`);
                asaasCustomerId = existingAsaasCustomer.data.id;
                
                // Verificar se há um vendedor vinculado a este ID do Asaas
                const sellerWithAsaasId = await Seller.findOne({ 
                    where: { payments_customer_id: asaasCustomerId } 
                });
                
                if (sellerWithAsaasId) {
                    return createError(`Já existe um vendedor (ID: ${sellerWithAsaasId.id}) vinculado a este cliente do Asaas`, 400);
                }
            } else {
                // Se não existe, criar novo cliente no Asaas usando o AsaasMapper
                const customerData = AsaasMapper.mapRawDataToCustomer(data, 'seller', AsaasCustomerService.SELLER_GROUP);
                
                // Tentar criar cliente no Asaas
                const asaasResult = await AsaasCustomerService.createOrUpdate(
                    customerData, 
                    AsaasCustomerService.SELLER_GROUP
                );
                
                // Se falhar no Asaas, não cria no banco local
                if (!asaasResult.success) {
                    return createError(`Falha ao sincronizar com Asaas: ${asaasResult.message}`, asaasResult.status || 400);
                }
                
                asaasCustomerId = asaasResult.data.id;
            }
            
            // 4. Adicionar ID do cliente Asaas nos dados e criar no banco local
            data.payments_customer_id = asaasCustomerId;

            // Usar transação para garantir consistência entre as entidades
            try {
                const result = await sequelize.transaction(async (t) => {
                    // Criar ou obter o UserData
                    let userData = existingUserData;
                    if (!userData) {
                        userData = await UserData.create({
                            cpfCnpj: data.cpfCnpj,
                            email: data.email || null,
                            mobilePhone: data.mobilePhone || null,
                            address: data.address || null,
                            addressNumber: data.addressNumber || null,
                            province: data.province || null,
                            postalCode: data.postalCode || null,
                            birthDate: data.birthDate || null
                        }, { transaction: t });
                    }

                    // Criar ou obter o User
                    let user;
                    if (existingUserData) {
                        user = await User.findOne({ 
                            where: { user_data_id: userData.id },
                            transaction: t
                        });
                    }
                    
                    if (!user) {
                        user = await User.create({
                            username: data.username || null,
                            email: data.email,
                            password: data.password || null,
                            user_data_id: userData.id
                        }, { transaction: t });
                    }

                    // Criar o Seller vinculado ao User
                    const seller = await Seller.create({
                        nuvemshop_id: data.nuvemshop_id,
                        nuvemshop_info: data.nuvemshop_info || null,
                        nuvemshop_api_token: data.nuvemshop_api_token || null,
                        app_status: data.app_status || null,
                        app_start_date: data.app_start_date || null,
                        user_id: user.id,
                        payments_customer_id: data.payments_customer_id || null
                    }, { transaction: t });

                    // Carregar o seller com as relações
                    const sellerWithRelations = await Seller.findByPk(seller.id, {
                        include: [
                            { 
                                model: User, 
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }] 
                            }
                        ],
                        transaction: t
                    });

                    return sellerWithRelations;
                });

                return { 
                    success: true, 
                    message: 'Vendedor criado com sucesso',
                    data: result
                };
            } catch (txError) {
                console.error('Erro na transação ao criar vendedor:', txError.message);
                return createError(`Erro ao salvar dados: ${txError.message}`, 500);
            }
        } catch (error) {
            console.error('Erro ao criar vendedor - service:', error.message);
            return formatError(error);
        }
    }

    async updateStoreInfo(nuvemshopId, api_token, storeInfo) {
        try {
            if (!nuvemshopId) {
                return createError('ID da Nuvemshop é obrigatório', 400);
            }
            
            if (!storeInfo || !storeInfo.email) {
                return createError('Email da loja é obrigatório', 400);
            }
            
            const nuvemshopInfo = typeof storeInfo === 'string' 
                ? storeInfo 
                : JSON.stringify(storeInfo);
            
            // Usar transação para garantir consistência
            const result = await sequelize.transaction(async (t) => {
                // 1. Verificar se já existe um seller com este nuvemshop_id
                let seller = await Seller.findOne({ 
                    where: { nuvemshop_id: nuvemshopId },
                    include: [{ model: User, as: 'user' }],
                    transaction: t
                });
                
                if (seller) {
                    // Se o seller já existe, apenas atualizar as informações
                    await seller.update({
                        nuvemshop_info: nuvemshopInfo,
                        nuvemshop_api_token: api_token
                    }, { transaction: t });
                    
                    // Atualizar o email do usuário se necessário
                    if (seller.user && seller.user.email !== storeInfo.email) {
                        await seller.user.update({
                            email: storeInfo.email
                        }, { transaction: t });
                    }
                    
                    return seller;
                }
                
                // 2. Se não existe seller, buscar ou criar o User baseado no email
                let user = await User.findOne({ 
                    where: { email: storeInfo.email },
                    transaction: t
                });
                
                if (!user) {
                    // Criar novo usuário com base nos dados da loja
                    user = await User.create({
                        email: storeInfo.email,
                        username: storeInfo.name?.pt || `loja_${nuvemshopId}`,
                        password: null // Senha será definida posteriormente se necessário
                    }, { transaction: t });
                }
                
                // 3. Criar o Seller vinculado ao User
                seller = await Seller.create({
                    nuvemshop_id: nuvemshopId,
                    nuvemshop_info: nuvemshopInfo,
                    nuvemshop_api_token: api_token,
                    user_id: user.id,
                    app_status: 'pending'
                }, { transaction: t });
                
                // Recarregar com as relações
                await seller.reload({
                    include: [{ model: User, as: 'user' }],
                    transaction: t
                });
                
                return seller;
            });
            
            console.log(`Informações da loja ${nuvemshopId} salvas com sucesso`);
            return { success: true, data: result };
            
        } catch (error) {
            console.error('Erro ao atualizar informações da loja:', error.message);
            return formatError(error);
        }
    }

    /**
     * Atualiza um vendedor somente após sincronização bem-sucedida com o Asaas
     */
    async update(id, data) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            const seller = await Seller.findByPk(id, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            // Validação dos dados de atualização
            SellerValidator.validateSellerUpdateData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se há dados relevantes para o Asaas
            const asaasRelevantFields = ['cpfCnpj', 'email', 'mobilePhone', 
                                        'address', 'addressNumber', 'province', 
                                        'postalCode'];
            
            const needsAsaasSync = asaasRelevantFields.some(field => data[field] !== undefined);
            
            // Se precisamos sincronizar com o Asaas
            if (needsAsaasSync) {
                // Criar objeto temporário com dados atualizados para o Asaas
                const tempSeller = JSON.parse(JSON.stringify(seller));
                
                // Atualizar UserData no tempSeller
                if (tempSeller.user && tempSeller.user.userData) {
                    if (data.cpfCnpj) tempSeller.user.userData.cpfCnpj = data.cpfCnpj;
                    if (data.mobilePhone) tempSeller.user.userData.mobilePhone = data.mobilePhone;
                    if (data.address) tempSeller.user.userData.address = data.address;
                    if (data.addressNumber) tempSeller.user.userData.addressNumber = data.addressNumber;
                    if (data.province) tempSeller.user.userData.province = data.province;
                    if (data.postalCode) tempSeller.user.userData.postalCode = data.postalCode;
                }
                
                // Atualizar User no tempSeller
                if (tempSeller.user && data.email) {
                    tempSeller.user.email = data.email;
                }
                
                try {
                    // Mapear para formato do Asaas
                    const customerData = AsaasMapper.mapSellerToCustomer(tempSeller, AsaasCustomerService.SELLER_GROUP);
                    
                    // Sincronizar com Asaas
                    const asaasResult = await AsaasCustomerService.createOrUpdate(
                        customerData, 
                        AsaasCustomerService.SELLER_GROUP
                    );
                    
                    // Se falhar no Asaas, não atualiza no banco local
                    if (!asaasResult.success) {
                        return createError(`Falha ao sincronizar com Asaas: ${asaasResult.message}`, asaasResult.status || 400);
                    }
                    
                    // Atualizar ID do cliente Asaas se necessário
                    if (asaasResult.data.id && (!seller.payments_customer_id || seller.payments_customer_id !== asaasResult.data.id)) {
                        data.payments_customer_id = asaasResult.data.id;
                    }
                } catch (asaasError) {
                    console.error('Erro na sincronização com Asaas:', asaasError.message);
                    return createError(`Erro ao sincronizar com Asaas: ${asaasError.message}`, 500);
                }
            }
            
            // Usar transação para atualizar entidades no banco local
            try {
                return await sequelize.transaction(async (t) => {
                    // 1. Atualizar UserData
                    if (seller.user && seller.user.userData) {
                        if (data.cpfCnpj || data.mobilePhone || data.address || 
                            data.addressNumber || data.province || data.postalCode || 
                            data.birthDate) {
                            
                            await seller.user.userData.update({
                                cpfCnpj: data.cpfCnpj || seller.user.userData.cpfCnpj,
                                mobilePhone: data.mobilePhone || seller.user.userData.mobilePhone,
                                address: data.address || seller.user.userData.address,
                                addressNumber: data.addressNumber || seller.user.userData.addressNumber,
                                province: data.province || seller.user.userData.province,
                                postalCode: data.postalCode || seller.user.userData.postalCode,
                                birthDate: data.birthDate || seller.user.userData.birthDate
                            }, { transaction: t });
                        }
                    }
                    
                    // 2. Atualizar User
                    if (seller.user && (data.email || data.username)) {
                        await seller.user.update({
                            email: data.email || seller.user.email,
                            username: data.username || seller.user.username
                        }, { transaction: t });
                    }
                    
                    // 3. Atualizar Seller
                    await seller.update({
                        nuvemshop_info: data.nuvemshop_info || seller.nuvemshop_info,
                        nuvemshop_api_token: data.nuvemshop_api_token || seller.nuvemshop_api_token,
                        app_status: data.app_status || seller.app_status,
                        payments_customer_id: data.payments_customer_id || seller.payments_customer_id
                    }, { transaction: t });
                    
                    // Recarregar o seller com as relações atualizadas
                    await seller.reload({
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
                        message: needsAsaasSync ? 
                            'Vendedor atualizado e sincronizado com Asaas com sucesso' : 
                            'Vendedor atualizado com sucesso',
                        data: seller
                    };
                });
            } catch (txError) {
                console.error('Erro na transação ao atualizar vendedor:', txError.message);
                return createError(`Erro ao atualizar dados: ${txError.message}`, 500);
            }
        } catch (error) {
            console.error('Erro ao atualizar vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            // Carregar o seller com suas associações - sempre incluir o User
            const seller = await Seller.findByPk(id, {
                include: [{ model: User, as: 'user' }]
            });
            
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            const userId = seller.user?.id;
            const userDataId = seller.user?.user_data_id;
            
            try {
                await sequelize.transaction(async (t) => {
                    // 1. Excluir o seller
                    await seller.destroy({ transaction: t });
                    
                    // 2. Se tiver usuário, verificar se pode excluí-lo
                    if (userId) {
                        // Verificar se o usuário está associado a outro seller ou shopper
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
                    message: `Vendedor com ID ${id} foi excluído com sucesso` 
                };
            } catch (txError) {
                console.error('Erro na transação ao excluir vendedor:', txError.message);
                return createError(`Erro ao excluir dados: ${txError.message}`, 500);
            }
        } catch (error) {
            console.error('Erro ao excluir vendedor:', error.message);
            return formatError(error);
        }
    }

    async savePaymentsInfo(storeId, payments) {
        try {
            if (!storeId) {
                return createError('ID da loja é obrigatório', 400);
            }
            
            const [seller, created] = await Seller.upsert({
                nuvemshop_id: storeId,
                payments_customer_id: payments.customer,
                payments_subscription_id: payments.id,
                payments_next_due: payments.nextDueDate,
                payments_status: "PENDING",
                app_status: payments.status
            });
            
            return { success: true, data: seller.dataValues };
        } catch (error) {
            console.error('Erro ao salvar informações de pagamento:', error.message);
            return formatError(error);
        }
    }

    async saveSubAccountInfo(storeId, account) {
        try {
            if (!storeId) {
                return createError('ID da loja é obrigatório', 400);
            }
            
            // Buscar o vendedor existente
            const seller = await Seller.findOne({ 
                where: { nuvemshop_id: storeId },
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            if (!seller) {
                return createError(`Vendedor com Nuvemshop ID ${storeId} não encontrado`, 404);
            }
            
            // Usar transação para atualizar os dados
            try {
                await sequelize.transaction(async (t) => {
                    // 1. Atualizar UserData
                    if (seller.user && seller.user.userData) {
                        await seller.user.userData.update({
                            cpfCnpj: account.cpfCnpj || seller.user.userData.cpfCnpj,
                            mobilePhone: account.mobilePhone || seller.user.userData.mobilePhone,
                            address: account.address || seller.user.userData.address,
                            addressNumber: account.addressNumber || seller.user.userData.addressNumber,
                            province: account.province || seller.user.userData.province,
                            postalCode: account.postalCode || seller.user.userData.postalCode
                        }, { transaction: t });
                    } else if (seller.user) {
                        // Criar UserData se não existir
                        const userData = await UserData.create({
                            cpfCnpj: account.cpfCnpj,
                            mobilePhone: account.mobilePhone || null,
                            address: account.address || null,
                            addressNumber: account.addressNumber || null,
                            province: account.province || null,
                            postalCode: account.postalCode || null
                        }, { transaction: t });
                        
                        // Atualizar user_data_id no User
                        await seller.user.update({
                            user_data_id: userData.id,
                            email: account.loginEmail || seller.user.email
                        }, { transaction: t });
                    }
                    
                    // 2. Atualizar Seller
                    await seller.update({
                        subaccount_id: account.id,
                        subaccount_wallet_id: account.walletId,
                        subaccount_api_key: account.apiKey
                    }, { transaction: t });
                });
                
                // Recarregar o seller com as relações atualizadas
                await seller.reload({
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
                    message: 'Informações da subconta salvas com sucesso',
                    data: seller
                };
            } catch (txError) {
                console.error('Erro na transação ao salvar subconta:', txError.message);
                return createError(`Erro ao salvar subconta: ${txError.message}`, 500);
            }
        } catch (error) {
            console.error('Erro ao salvar informações da subconta:', error.message);
            return formatError(error);
        }
    }

    async findByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório', 400);
            }
            
            // Buscar UserData pelo CPF/CNPJ
            const userData = await UserData.findOne({
                where: { cpfCnpj: cpfCnpj }
            });
            
            if (!userData) {
                return { success: true, data: null };
            }
            
            // Buscar User vinculado ao UserData
            const user = await User.findOne({
                where: { user_data_id: userData.id }
            });
            
            if (!user) {
                return { success: true, data: null };
            }
            
            // Buscar Seller vinculado ao User
            const seller = await Seller.findOne({
                where: { user_id: user.id },
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });
            
            return { success: true, data: seller };
        } catch (error) {
            console.error('Erro ao buscar vendedor por CPF/CNPJ:', error.message);
            return formatError(error);
        }
    }

    /**
     * Sincroniza um vendedor com o Asaas
     * @param {string} id - ID do vendedor
     * @returns {Promise<Object>} - Resultado da operação
     */
    async syncWithAsaas(id) {
        try {
            const seller = await Seller.findByPk(id, {
                include: [{ model: User, as: 'user', include: [{ model: UserData, as: 'userData' }] }]
            });
            
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            if (!seller.user || !seller.user.userData || !seller.user.userData.cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório para sincronizar com Asaas', 400);
            }
            
            // Usar o AsaasMapper para mapear os dados
            const customerData = AsaasMapper.mapSellerToCustomer(seller, AsaasCustomerService.SELLER_GROUP);
            
            // Cria ou atualiza o cliente no Asaas
            const result = await AsaasCustomerService.createOrUpdate(
                customerData, 
                AsaasCustomerService.SELLER_GROUP
            );
            
            if (result.success) {
                return { success: true, message: 'Sincronização com Asaas realizada com sucesso', data: result.data };
            } else {
                return createError(`Erro ao sincronizar com Asaas: ${result.message}`, result.status || 400);
            }
        } catch (error) {
            console.error('Erro ao sincronizar vendedor com Asaas:', error.message);
            return formatError(error);
        }
    }

    /**
     * Atualiza os métodos de pagamento aceitos pelo seller
     * @param {number} id - ID do seller
     * @param {Array} paymentMethods - Array com os métodos de pagamento
     * @returns {Promise<Object>} Resultado da operação
     */
    async updatePaymentMethods(id, paymentMethods) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            // Validação dos métodos de pagamento
            PaymentMethodsValidator.validatePaymentMethods(paymentMethods);
            
            // Buscar o seller
            const seller = await Seller.findByPk(id);
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            // Verificar se os métodos são válidos
            const defaultMethods = ['credit_card', 'pix', 'boleto'];
            if (!paymentMethods || !Array.isArray(paymentMethods) || paymentMethods.length === 0) {
                paymentMethods = defaultMethods;
                console.log(`Seller ID ${id}: Usando métodos de pagamento padrão:`, defaultMethods);
            }
            
            // Atualizar os métodos de pagamento
            seller.accepted_payment_methods = paymentMethods;
            await seller.save();
            
            return { 
                success: true, 
                message: 'Métodos de pagamento atualizados com sucesso', 
                data: seller 
            };
        } catch (error) {
            console.error('Erro ao atualizar métodos de pagamento:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Adiciona um método de pagamento aos aceitos pelo seller
     * @param {number} id - ID do seller 
     * @param {string} paymentMethod - Método de pagamento a ser adicionado
     * @returns {Promise<Object>} Resultado da operação
     */
    async addPaymentMethod(id, paymentMethod) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            // Validação do método de pagamento
            PaymentMethodsValidator.validateSinglePaymentMethod(paymentMethod);
            
            // Buscar o seller
            const seller = await Seller.findByPk(id);
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            // Garantir que accepted_payment_methods tenha um valor padrão se for null
            if (!seller.accepted_payment_methods || !Array.isArray(seller.accepted_payment_methods)) {
                seller.accepted_payment_methods = ['credit_card', 'pix', 'boleto'];
            }
            
            // Verificar se o método já está aceito
            if (seller.isPaymentMethodAccepted(paymentMethod)) {
                return createError(`Método de pagamento '${paymentMethod}' já está aceito pelo vendedor`, 400);
            }
            
            // Adicionar o método de pagamento
            seller.addPaymentMethod(paymentMethod);
            await seller.save();
            
            return { 
                success: true, 
                message: `Método de pagamento '${paymentMethod}' adicionado com sucesso`, 
                data: seller 
            };
        } catch (error) {
            console.error('Erro ao adicionar método de pagamento:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Remove um método de pagamento dos aceitos pelo seller
     * @param {number} id - ID do seller
     * @param {string} paymentMethod - Método de pagamento a ser removido
     * @returns {Promise<Object>} Resultado da operação
     */
    async removePaymentMethod(id, paymentMethod) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            // Validação do método de pagamento
            PaymentMethodsValidator.validateSinglePaymentMethod(paymentMethod);
            
            // Buscar o seller
            const seller = await Seller.findByPk(id);
            if (!seller) {
                return createError(`Vendedor com ID ${id} não encontrado`, 404);
            }
            
            // Garantir que accepted_payment_methods tenha um valor padrão se for null
            if (!seller.accepted_payment_methods || !Array.isArray(seller.accepted_payment_methods)) {
                seller.accepted_payment_methods = ['credit_card', 'pix', 'boleto'];
            }
            
            // Verificar se o método está aceito
            if (!seller.isPaymentMethodAccepted(paymentMethod)) {
                return createError(`Método de pagamento '${paymentMethod}' não está aceito pelo vendedor`, 400);
            }
            
            // Remover o método de pagamento
            seller.removePaymentMethod(paymentMethod);
            await seller.save();
            
            return { 
                success: true, 
                message: `Método de pagamento '${paymentMethod}' removido com sucesso`, 
                data: seller 
            };
        } catch (error) {
            console.error('Erro ao remover método de pagamento:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Busca um seller pelo ID da loja (store_id) da Nuvemshop
     * @param {string} storeId - ID da loja na Nuvemshop
     * @returns {Promise<Object>} Resultado da operação
     */
    async getByStoreId(storeId) {
        try {
            if (!storeId) {
                return createError('ID da loja é obrigatório', 400);
            }
            
            const seller = await Seller.findOne({
                where: { nuvemshop_id: storeId },
                include: [{ 
                    model: User, 
                    as: 'user',
                    include: [{ model: UserData, as: 'userData' }] 
                }]
            });
            
            if (!seller) {
                return createError(`Seller com store_id ${storeId} não encontrado`, 404);
            }
            
            return { 
                success: true, 
                data: seller 
            };
        } catch (error) {
            console.error('Erro ao buscar seller por store_id:', error.message);
            return formatError(error);
        }
    }

    /**
     * Adicionar subconta ao seller
     */
}

module.exports = new SellerService();