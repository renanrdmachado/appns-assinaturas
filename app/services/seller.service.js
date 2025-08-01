const Seller = require('../models/Seller');
const User = require('../models/User');
const UserData = require('../models/UserData');
const Shopper = require('../models/Shopper'); // Adicionando importação do Shopper
const SellerSubscription = require('../models/SellerSubscription');
const { createError, formatError } = require('../utils/errorHandler');
const AsaasCustomerService = require('./asaas/customer.service');
const SellerValidator = require('../validators/seller-validator');
const PaymentMethodsValidator = require('../validators/payment-methods-validator');
const { checkSubscriptionMiddleware } = require('../utils/subscription-validator');
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
            const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(data.cpfCnpj, AsaasCustomerService.SELLER_GROUP);
            
            let asaasCustomerId;
            
            if (existingAsaasCustomer.success) {
                // Se já existe cliente no Asaas, usamos o ID existente
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

                    // Assinatura será criada apenas quando completar documentos
                    // await this.createDefaultSubscription(seller.id, t);

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

    async updateStoreInfo(nuvemshop_id, nuvemshop_api_token, storeInfo) {
        try {
            let seller = await Seller.findOne({
                where: { nuvemshop_id },
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ]
            });

            // Se o seller não existir, criar um automaticamente
            if (!seller) {
                console.log(`Seller com nuvemshop_id ${nuvemshop_id} não encontrado, criando automaticamente...`);
                
                // Usar transação para garantir consistência
                const result = await sequelize.transaction(async (t) => {
                    // 1. Criar UserData básico usando informações do business se disponível
                    const userData = await UserData.create({
                        cpfCnpj: storeInfo.business_id || null, // Usar business_id se disponível
                        mobilePhone: storeInfo.phone || null,
                        address: storeInfo.business_address || storeInfo.address || null,
                        addressNumber: null,
                        province: null,
                        postalCode: null,
                        birthDate: null
                    }, { transaction: t });

                    // 2. Criar User básico
                    const user = await User.create({
                        username: `seller_${nuvemshop_id}`,
                        email: storeInfo.email || `seller_${nuvemshop_id}@temp.com`,
                        password: null, // Será definido pelo seller posteriormente
                        user_data_id: userData.id
                    }, { transaction: t });

                    // 3. Criar seller básico
                    const newSeller = await Seller.create({
                        user_id: user.id,
                        nuvemshop_id,
                        nuvemshop_api_token,
                        nuvemshop_info: JSON.stringify(storeInfo),
                        app_status: storeInfo.business_id ? 'active' : 'pending', // Status baseado na disponibilidade de business_id
                        app_start_date: new Date()
                    }, { transaction: t });

                                            // 4. Criar customer temporário no Asaas apenas se tiver informações válidas
                        if (storeInfo.email && storeInfo.business_id) {
                            const tempCustomerData = {
                                name: (storeInfo.name?.pt || storeInfo.name || storeInfo.business_name || `Loja ${nuvemshop_id}`),
                                email: storeInfo.email,
                                cpfCnpj: storeInfo.business_id, // Usar business_id se disponível
                                mobilePhone: storeInfo.phone || null,
                                groupName: AsaasCustomerService.SELLER_GROUP
                            };

                            console.log('DEBUG - Dados do customer temporário:', JSON.stringify(tempCustomerData, null, 2));

                            const asaasResult = await AsaasCustomerService.createOrUpdate(
                                tempCustomerData,
                                AsaasCustomerService.SELLER_GROUP
                            );

                            if (asaasResult.success) {
                                // Atualizar seller com o ID do customer Asaas
                                newSeller.payments_customer_id = asaasResult.data.id;
                                await newSeller.save({ transaction: t });
                                console.log(`Customer temporário criado no Asaas: ${asaasResult.data.id}`);
                            } else {
                                console.error(`Falha ao criar customer temporário no Asaas: ${asaasResult.message}`);
                                // Não falha a criação do seller se não tiver dados completos do business
                                console.warn('Seller será criado sem integração inicial com Asaas devido à falta de business_id');
                            }
                        } else {
                            console.log('Seller criado sem integração inicial com Asaas - business_id ou email não disponível');
                        }

                    // Se seller tem dados completos (business_id), criar assinatura
                    if (storeInfo.business_id) {
                        console.log(`Seller ${newSeller.id} tem dados completos - criando assinatura diretamente`);
                        await this.createDefaultSubscription(newSeller.id, t);
                    } else {
                        console.log(`Seller ${newSeller.id} sem dados completos - assinatura será criada quando completar documentos`);
                    }

                    return await Seller.findByPk(newSeller.id, {
                        include: [
                            { 
                                model: User, 
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }] 
                            }
                        ],
                        transaction: t
                    });
                });

                console.log(`Seller criado automaticamente com ID: ${result.id}`);
                return {
                    success: true,
                    message: 'Seller criado e informações da loja salvas com sucesso',
                    data: result
                };
            }

            // Se o seller existir, atualizar suas informações
            const result = await sequelize.transaction(async (t) => {
                // Atualizar informações do vendedor
                seller.nuvemshop_api_token = nuvemshop_api_token;
                seller.nuvemshop_info = JSON.stringify(storeInfo);
                seller.app_status = storeInfo.plan_name || seller.app_status || 'active';
                await seller.save({ transaction: t });

                // Verificar se possui assinatura, se não criar uma padrão
                const hasSubscription = await SellerSubscription.findOne({
                    where: { seller_id: seller.id },
                    transaction: t
                });

                if (!hasSubscription) {
                    // Extrair informações da loja para verificar se tem dados completos
                    let currentStoreInfo;
                    try {
                        currentStoreInfo = seller.nuvemshop_info ? 
                            (typeof seller.nuvemshop_info === 'string' ? 
                                JSON.parse(seller.nuvemshop_info) : 
                                seller.nuvemshop_info) : {};
                    } catch (error) {
                        currentStoreInfo = {};
                    }
                    
                    if (currentStoreInfo.business_id || storeInfo.business_id) {
                        console.log(`Seller ${seller.id} tem dados completos - criando assinatura`);
                        await this.createDefaultSubscription(seller.id, t);
                    } else {
                        console.log(`Seller ${seller.id} não possui assinatura - aguardando completar documentos para criar`);
                    }
                } else {
                    // Verificar se assinatura existente tem external_id (foi criada no Asaas)
                    if (!hasSubscription.external_id) {
                        console.log(`Seller ${seller.id} possui assinatura local sem integração Asaas`);
                        // Não tentar migrar automaticamente
                    }
                }

                return await Seller.findByPk(seller.id, {
                    include: [
                        { 
                            model: User, 
                            as: 'user',
                            include: [{ model: UserData, as: 'userData' }] 
                        }
                    ],
                    transaction: t
                });
            });

            return {
                success: true,
                message: 'Informações da loja atualizadas com sucesso',
                data: result
            };
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
            
            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await checkSubscriptionMiddleware(id);
            if (subscriptionError) {
                return subscriptionError;
            }
            
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
            
            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await checkSubscriptionMiddleware(id);
            if (subscriptionError) {
                return subscriptionError;
            }
            
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
            
            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await checkSubscriptionMiddleware(id);
            if (subscriptionError) {
                return subscriptionError;
            }
            
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

    /**
     * Cria uma assinatura padrão para o seller com integração Asaas
     * Seguindo princípios SOLID: Single Responsibility - apenas cria assinatura
     */
    async createDefaultSubscription(sellerId, transaction = null) {
        try {
            // Verificar se já existe uma assinatura (DRY - evita duplicação)
            const existingSubscription = await SellerSubscription.findOne({
                where: { seller_id: sellerId },
                transaction
            });

            if (existingSubscription) {
                return { success: true, message: 'Assinatura já existe', data: existingSubscription };
            }

            // Buscar o seller com dados do usuário para criar no Asaas
            const seller = await Seller.findByPk(sellerId, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ],
                transaction
            });

            if (!seller) {
                throw new Error(`Seller com ID ${sellerId} não encontrado`);
            }

            // Configuração padrão da assinatura
            let storeInfo;
            try {
                storeInfo = seller.nuvemshop_info ? 
                    (typeof seller.nuvemshop_info === 'string' ? 
                        JSON.parse(seller.nuvemshop_info) : 
                        seller.nuvemshop_info) : {};
            } catch (error) {
                console.error('Erro ao fazer parse do nuvemshop_info:', error);
                storeInfo = {};
            }
            
            const validCpfCnpj = storeInfo.business_id || seller.user?.userData?.cpfCnpj;
            const subscriptionStatus = validCpfCnpj ? 'active' : 'pending';
            const defaultSubscriptionData = this.getDefaultSubscriptionConfig(sellerId, subscriptionStatus);

            console.log(`Verificando possibilidade de integração com Asaas para seller ${sellerId}...`);
            console.log(`Business ID disponível: ${!!storeInfo.business_id}`);
            console.log(`Status da assinatura: ${subscriptionStatus}`);
            
            try {
                // Se seller não tem customer_id, tentar criar se tiver dados válidos
                if (!seller.payments_customer_id) {
                    let storeInfo;
                    try {
                        storeInfo = seller.nuvemshop_info ? 
                            (typeof seller.nuvemshop_info === 'string' ? 
                                JSON.parse(seller.nuvemshop_info) : 
                                seller.nuvemshop_info) : {};
                    } catch (error) {
                        console.error('Erro ao fazer parse do nuvemshop_info:', error);
                        storeInfo = {};
                    }
                    const userData = seller.user?.userData;
                    
                    console.log(`DEBUG - Dados disponíveis para customer:`, {
                        storeInfo: {
                            name: storeInfo.name?.pt,
                            email: storeInfo.email,
                            phone: storeInfo.phone,
                            business_id: storeInfo.business_id
                        },
                        userData: {
                            cpfCnpj: userData?.cpfCnpj,
                            phone: userData?.mobilePhone
                        }
                    });
                    
                    // Só tentar criar no Asaas se tiver CPF/CNPJ válido
                    const validCpfCnpj = storeInfo.business_id || userData?.cpfCnpj;
                    
                    if (validCpfCnpj && storeInfo.email) {
                        console.log('Dados suficientes para integração com Asaas - criando customer e assinatura');
                        // Preparar dados do customer usando informações disponíveis
                        const customerData = {
                            name: storeInfo.name?.pt || storeInfo.business_name || `Loja ${seller.nuvemshop_id}`,
                            email: storeInfo.email || seller.user?.email || `seller_${seller.nuvemshop_id}@temp.com`,
                            cpfCnpj: validCpfCnpj,
                            mobilePhone: storeInfo.phone || userData?.mobilePhone || null,
                            groupName: AsaasCustomerService.SELLER_GROUP
                        };

                        console.log(`DEBUG - Customer data para Asaas:`, customerData);

                        console.log(`Criando customer no Asaas para seller ${sellerId}...`);
                        const customerResult = await AsaasCustomerService.createOrUpdate(
                            customerData,
                            AsaasCustomerService.SELLER_GROUP
                        );

                        console.log(`DEBUG - Resultado da criação do customer:`, {
                            success: customerResult.success,
                            message: customerResult.message,
                            customerId: customerResult.success ? customerResult.data?.id : null
                        });

                        if (customerResult.success) {
                            // Atualizar seller com o ID do customer
                            seller.payments_customer_id = customerResult.data.id;
                            await seller.save({ transaction });
                            console.log(`Customer criado no Asaas: ${customerResult.data.id}`);
                        } else {
                            console.error(`Falha ao criar customer no Asaas: ${customerResult.message}`);
                            console.warn('Criando assinatura pendente devido à falha no Asaas');
                        }
                    } else {
                        console.log('Dados insuficientes para integração com Asaas - assinatura será criada como pending');
                        console.log(`Dados faltantes: ${!validCpfCnpj ? 'CPF/CNPJ' : ''} ${!storeInfo.email ? 'Email' : ''}`);
                    }
                }

                // Se tiver customer no Asaas, tentar criar assinatura no Asaas
                if (seller.payments_customer_id) {
                    // Agora criar a assinatura no Asaas usando o SellerSubscriptionService
                    const SellerSubscriptionService = require('./seller-subscription.service');
                    
                    const planData = {
                        plan_name: defaultSubscriptionData.plan_name,
                        value: defaultSubscriptionData.value,
                        cycle: defaultSubscriptionData.cycle,
                        features: defaultSubscriptionData.features
                    };

                    const billingInfo = {
                        billingType: 'CREDIT_CARD', // Tipo padrão
                        name: seller.user?.username || `Seller ${seller.nuvemshop_id}`,
                        email: seller.user?.email || (function() {
                            try {
                                return seller.nuvemshop_info ? 
                                    (typeof seller.nuvemshop_info === 'string' ? 
                                        JSON.parse(seller.nuvemshop_info).email : 
                                        seller.nuvemshop_info.email) : null;
                            } catch (e) {
                                return null;
                            }
                        })(),
                        cpfCnpj: seller.user?.userData?.cpfCnpj || null, // Usar dados reais quando disponíveis
                        phone: seller.user?.userData?.mobilePhone || null
                    };

                    console.log(`DEBUG - Plan data:`, planData);
                    console.log(`DEBUG - Billing info:`, billingInfo);

                    const asaasResult = await SellerSubscriptionService.createSubscription(sellerId, planData, billingInfo);

                    console.log(`DEBUG - Resultado da criação da assinatura:`, {
                        success: asaasResult.success,
                        message: asaasResult.message,
                        external_id: asaasResult.success ? asaasResult.data?.external_id : null
                    });

                    if (asaasResult.success) {
                        console.log(`Assinatura criada no Asaas com sucesso: ${asaasResult.data.external_id}`);
                        return { 
                            success: true, 
                            message: 'Assinatura padrão criada com sucesso no Asaas',
                            data: asaasResult.data 
                        };
                    } else {
                        console.warn(`Falha ao criar assinatura no Asaas: ${asaasResult.message}`);
                        // Fallback para criação local
                    }
                }

                // Fallback: criar assinatura apenas localmente
                console.log(`Criando assinatura localmente com status: ${subscriptionStatus}`);
                const localSubscription = await SellerSubscription.create(defaultSubscriptionData, { transaction });
                
                const message = subscriptionStatus === 'pending' ? 
                    'Assinatura criada - aguardando complemento de dados para integração com Asaas' :
                    'Assinatura criada localmente (integração com Asaas pendente)';
                
                return { 
                    success: true, 
                    message: message,
                    data: localSubscription,
                    needsDocuments: subscriptionStatus === 'pending'
                };

            } catch (asaasError) {
                console.warn(`Erro ao criar assinatura no Asaas: ${asaasError.message}`);
                console.error(`DEBUG - Stack trace:`, asaasError.stack);
                // Fallback para criação local
                const localSubscription = await SellerSubscription.create(defaultSubscriptionData, { transaction });
                return { 
                    success: true, 
                    message: 'Assinatura criada localmente (erro no Asaas)',
                    data: localSubscription 
                };
            }

        } catch (error) {
            console.error(`Erro ao criar assinatura padrão para seller ${sellerId}:`, error.message);
            // Não falha a criação do seller por conta da assinatura
            return { 
                success: false, 
                message: `Erro ao criar assinatura padrão: ${error.message}`,
                data: null 
            };
        }
    }

    /**
     * Configuração padrão da assinatura (DRY - centraliza configuração)
     * Seguindo princípios SOLID: Open/Closed - fácil de estender sem modificar
     */
    getDefaultSubscriptionConfig(sellerId, status = 'active') {
        return {
            seller_id: sellerId,
            plan_name: 'Plano Básico',
            value: 29.90,
            status: status,
            cycle: 'MONTHLY',
            start_date: new Date(),
            next_due_date: this.calculateNextDueDate(new Date(), 'MONTHLY'),
            features: {
                max_products: 100,
                max_orders_per_month: 500,
                support_level: 'basic'
            },
            metadata: {
                created_automatically: true,
                creation_source: 'seller_creation'
            }
        };
    }

    /**
     * Calcula a próxima data de vencimento (Utility method - SOLID)
     */
    calculateNextDueDate(startDate, cycle) {
        const date = new Date(startDate);
        
        const cycleMapping = {
            'WEEKLY': () => date.setDate(date.getDate() + 7),
            'BIWEEKLY': () => date.setDate(date.getDate() + 14),
            'MONTHLY': () => date.setMonth(date.getMonth() + 1),
            'BIMONTHLY': () => date.setMonth(date.getMonth() + 2),
            'QUARTERLY': () => date.setMonth(date.getMonth() + 3),
            'SEMIANNUALLY': () => date.setMonth(date.getMonth() + 6),
            'YEARLY': () => date.setFullYear(date.getFullYear() + 1)
        };
        
        const cycleFunction = cycleMapping[cycle] || cycleMapping['MONTHLY'];
        cycleFunction();
        
        return date;
    }

    /**
     * Completa os dados do seller e ativa integração com Asaas
     * @param {number} sellerId - ID do seller
     * @param {Object} documentData - Dados do documento (cpfCnpj, name, phone, address)
     * @returns {Object} - Resultado da operação
     */
    async updateSellerDocuments(sellerId, documentData) {
        const transaction = await sequelize.transaction();
        
        try {
            const { cpfCnpj, name, phone, address } = documentData;

            // Validar dados obrigatórios
            if (!cpfCnpj) {
                await transaction.rollback();
                return createError('CPF/CNPJ é obrigatório', 400);
            }

            // Buscar seller com relações
            const seller = await Seller.findByPk(sellerId, {
                include: [
                    { 
                        model: User, 
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }] 
                    }
                ],
                transaction
            });

            if (!seller) {
                await transaction.rollback();
                return createError(`Seller com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se seller está pendente de documentos
            if (seller.app_status !== 'pending') {
                await transaction.rollback();
                return createError('Seller não está pendente de documentos', 400);
            }

            // Atualizar UserData com os novos dados
            const userData = seller.user.userData;
            await userData.update({
                cpfCnpj: cpfCnpj,
                mobilePhone: phone || userData.mobilePhone,
                address: address || userData.address
            }, { transaction });

            // Atualizar User com nome se fornecido
            if (name) {
                await seller.user.update({
                    username: name
                }, { transaction });
            }

            // Preparar dados para criar customer no Asaas
            const storeInfo = seller.nuvemshop_info;
            const customerData = {
                name: name || storeInfo?.name?.pt || storeInfo?.business_name || `Loja ${seller.nuvemshop_id}`,
                email: storeInfo?.email || seller.user.email,
                cpfCnpj: cpfCnpj,
                mobilePhone: phone || storeInfo?.phone,
                groupName: AsaasCustomerService.SELLER_GROUP
            };

            console.log(`Criando customer no Asaas para seller ${sellerId} com dados completos:`, customerData);

            // Criar customer no Asaas
            const customerResult = await AsaasCustomerService.createOrUpdate(
                customerData,
                AsaasCustomerService.SELLER_GROUP
            );

            if (!customerResult.success) {
                console.error(`Falha ao criar customer no Asaas: ${customerResult.message}`);
                await transaction.rollback();
                return customerResult;
            }

            // Atualizar seller apenas com customer_id (manter status pending)
            await seller.update({
                payments_customer_id: customerResult.data.id
                // Não mudar app_status ainda - só após criar assinatura
            }, { transaction });

            // Criar assinatura diretamente no Asaas (não usar assinatura pendente)
            console.log(`Criando assinatura no Asaas para seller ${sellerId}`);

            const planData = {
                plan_name: 'Plano Básico',
                value: 29.90,
                cycle: 'MONTHLY',
                features: {
                    max_products: 100,
                    max_orders_per_month: 500,
                    support_level: 'basic'
                }
            };

            const billingInfo = {
                billingType: 'CREDIT_CARD',
                name: customerData.name,
                email: customerData.email,
                cpfCnpj: customerData.cpfCnpj,
                phone: customerData.mobilePhone
            };

            const SellerSubscriptionService = require('./seller-subscription.service');
            const asaasResult = await SellerSubscriptionService.createSubscription(sellerId, planData, billingInfo);

            if (!asaasResult.success) {
                console.error(`Falha ao criar assinatura no Asaas: ${asaasResult.message}`);
                await transaction.rollback();
                return createError(`Falha ao criar assinatura: ${asaasResult.message}`, 400);
            }

            // Só agora atualizar o status do seller para active (assinatura já está ativa no Asaas)
            await seller.update({
                app_status: 'active'
            }, { transaction });

            console.log(`Assinatura criada com sucesso no Asaas: ${asaasResult.data.asaas_subscription.id}`);

            await transaction.commit();

            console.log(`Dados do seller ${sellerId} completados com sucesso`);

            return {
                success: true,
                message: 'Dados completados e assinatura criada com sucesso',
                data: {
                    seller: seller,
                    asaas_customer_id: customerResult.data.id,
                    asaas_subscription_id: asaasResult.data.asaas_subscription.id,
                    subscription_created: true
                }
            };

        } catch (error) {
            await transaction.rollback();
            console.error('Erro ao completar dados do seller:', error);
            return formatError(error);
        }
    }
}

module.exports = new SellerService();