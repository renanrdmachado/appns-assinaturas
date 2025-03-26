const Seller = require('../models/Seller');
const { formatError } = require('../utils/errorHandler');
const AsaasCustomerService = require('./asaas/customer.service');
const SellerValidator = require('../validators/seller-validator');
const AsaasApiClient = require('../helpers/AsaasApiClient');

class SellerService {
    async get(id) {
        try {
            // Validação do ID
            SellerValidator.validateId(id);
            
            const seller = await Seller.findByPk(id);
            console.log("Service / Seller: ", seller);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
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
                return { success: false, message: `Vendedor com Nuvemshop ID ${nuvemshopId} não encontrado`, status: 404 };
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
            // Validação dos dados
            SellerValidator.validateSellerData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // 1. Verificar se já existe um vendedor com este nuvemshop_id no banco local
            const existingSeller = await Seller.findOne({ where: { nuvemshop_id: data.nuvemshop_id } });
            if (existingSeller) {
                return { 
                    success: false, 
                    message: 'Já existe um vendedor com este ID da Nuvemshop',
                    status: 400
                };
            }
            
            // 2. Verificar se já existe um vendedor com este CPF/CNPJ no banco local
            const sellerWithSameCpfCnpj = await Seller.findOne({ where: { Asaas_cpfCnpj: data.Asaas_cpfCnpj } });
            if (sellerWithSameCpfCnpj) {
                return {
                    success: false,
                    message: `Já existe um vendedor com o CPF/CNPJ ${data.Asaas_cpfCnpj} cadastrado (ID: ${sellerWithSameCpfCnpj.id})`,
                    status: 400
                };
            }
            
            // Verificar se temos CPF/CNPJ para a sincronização com o Asaas
            if (!data.Asaas_cpfCnpj) {
                return {
                    success: false,
                    message: 'CPF/CNPJ é obrigatório para criar um vendedor',
                    status: 400
                };
            }
            
            // 3. Verificar se já existe um cliente com este CPF/CNPJ no Asaas
            console.log(`Verificando se já existe cliente com CPF/CNPJ ${data.Asaas_cpfCnpj} no Asaas...`);
            const existingAsaasCustomer = await AsaasCustomerService.findByCpfCnpj(data.Asaas_cpfCnpj, AsaasCustomerService.SELLER_GROUP);
            
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
                    return {
                        success: false,
                        message: `Já existe um vendedor (ID: ${sellerWithAsaasId.id}) vinculado a este cliente do Asaas`,
                        status: 400
                    };
                }
                
                // Se chegou aqui, podemos usar o cliente existente no Asaas
            } else {
                // Se não existe, criar novo cliente no Asaas
                // Extrair info da loja do JSON
                const storeInfo = typeof data.nuvemshop_info === 'string' 
                    ? JSON.parse(data.nuvemshop_info) 
                    : data.nuvemshop_info || {};
                    
                // Mapear dados para o formato do Asaas
                const customerData = {
                    name: storeInfo.name || storeInfo.storeName || 'Loja ' + data.nuvemshop_id,
                    cpfCnpj: data.Asaas_cpfCnpj,
                    email: data.Asaas_loginEmail || storeInfo.email || undefined,
                    mobilePhone: data.Asaas_mobilePhone || undefined,
                    address: data.Asaas_address || undefined,
                    addressNumber: data.Asaas_addressNumber || undefined,
                    province: data.Asaas_province || undefined,
                    postalCode: data.Asaas_postalCode || undefined,
                    externalReference: data.nuvemshop_id.toString(),
                    groupName: AsaasCustomerService.SELLER_GROUP,
                    observations: `Vendedor da Nuvemshop ID: ${data.nuvemshop_id}`,
                    notificationDisabled: false
                };
                
                console.log('Criando novo cliente no Asaas para vendedor...');
                
                // Tentar criar cliente no Asaas
                const asaasResult = await AsaasCustomerService.createOrUpdate(
                    customerData, 
                    AsaasCustomerService.SELLER_GROUP
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
            
            // Criar o seller no banco de dados local
            const seller = await Seller.create(data);
            console.log('Seller created com Asaas sync:', seller.id);
            
            return { 
                success: true, 
                message: 'Vendedor criado e sincronizado com Asaas com sucesso',
                data: seller
            };
        } catch (error) {
            console.error('Erro ao criar vendedor - service:', error.message);
            return formatError(error);
        }
    }

    async updateStoreInfo(nuvemshopId, api_token, storeInfo) {
        try {
            if (!nuvemshopId) {
                return { success: false, message: 'ID da Nuvemshop é obrigatório', status: 400 };
            }
            
            const nuvemshopInfo = typeof storeInfo === 'string' 
                ? storeInfo 
                : JSON.stringify(storeInfo);
            
            const [seller, created] = await Seller.upsert({
                nuvemshop_id: nuvemshopId,
                nuvemshop_info: nuvemshopInfo,
                nuvemshop_api_token: api_token
            });
            
            return { success: true, data: seller };
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
            
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            // Validação dos dados de atualização
            SellerValidator.validateSellerUpdateData(data);
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Verificar se há dados relevantes para o Asaas
            const asaasRelevantFields = ['Asaas_cpfCnpj', 'Asaas_loginEmail', 'Asaas_mobilePhone', 
                                        'Asaas_address', 'Asaas_addressNumber', 'Asaas_province', 
                                        'Asaas_postalCode'];
            
            const needsAsaasSync = asaasRelevantFields.some(field => data[field] !== undefined);
            
            // Se precisamos sincronizar com o Asaas
            if (needsAsaasSync) {
                // Obter CPF/CNPJ atual ou atualizado
                const cpfCnpj = data.Asaas_cpfCnpj || seller.Asaas_cpfCnpj;
                
                if (!cpfCnpj) {
                    return {
                        success: false,
                        message: 'CPF/CNPJ é obrigatório para sincronizar com o Asaas',
                        status: 400
                    };
                }
                
                // Mapear dados para o Asaas
                const mergedData = { ...seller.toJSON(), ...data };
                
                // Extrair info da loja do JSON
                const storeInfo = typeof mergedData.nuvemshop_info === 'string' 
                    ? JSON.parse(mergedData.nuvemshop_info) 
                    : mergedData.nuvemshop_info || {};
                
                const customerData = {
                    name: storeInfo.name || storeInfo.storeName || 'Loja ' + mergedData.nuvemshop_id,
                    cpfCnpj: mergedData.Asaas_cpfCnpj,
                    email: mergedData.Asaas_loginEmail || storeInfo.email || undefined,
                    mobilePhone: mergedData.Asaas_mobilePhone || undefined,
                    address: mergedData.Asaas_address || undefined,
                    addressNumber: mergedData.Asaas_addressNumber || undefined,
                    province: mergedData.Asaas_province || undefined,
                    postalCode: mergedData.Asaas_postalCode || undefined,
                    externalReference: mergedData.nuvemshop_id.toString(),
                    groupName: AsaasCustomerService.SELLER_GROUP,
                    observations: `Vendedor da Nuvemshop ID: ${mergedData.nuvemshop_id}`,
                    notificationDisabled: false
                };
                
                console.log('Sincronizando dados atualizados com Asaas antes de salvar no banco...');
                
                // Primeiro tentar sincronizar com o Asaas
                const asaasResult = await AsaasCustomerService.createOrUpdate(
                    customerData, 
                    AsaasCustomerService.SELLER_GROUP
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
                if (asaasResult.data.id && (!seller.payments_customer_id || seller.payments_customer_id !== asaasResult.data.id)) {
                    data.payments_customer_id = asaasResult.data.id;
                }
            }
            
            // Atualizar o seller no banco de dados local
            await seller.update(data);
            await seller.reload();
            
            console.log('Seller updated:', seller.id);
            return { 
                success: true, 
                message: needsAsaasSync ? 
                    'Vendedor atualizado e sincronizado com Asaas com sucesso' : 
                    'Vendedor atualizado com sucesso',
                data: seller
            };
        } catch (error) {
            console.error('Erro ao atualizar vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            await seller.destroy();
            console.log(`Vendedor com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Vendedor com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir vendedor:', error.message);
            return formatError(error);
        }
    }

    async savePaymentsInfo(storeId, payments) {
        try {
            console.log("savePaymentsInfo - store", storeId);
            console.log("savePaymentsInfo - payments", payments);
            
            if (!storeId) {
                return { success: false, message: 'ID da loja é obrigatório', status: 400 };
            }
            
            const [seller, created] = await Seller.upsert({
                nuvemshop_id: storeId,
                payments_customer_id: payments.customer,
                payments_subscription_id: payments.id,
                payments_next_due: payments.nextDueDate,
                payments_status: "PENDING",
                app_status: payments.status
            });
            
            const dataJson = seller.dataValues;
            console.log('Seller store info updated:', dataJson);
            return { success: true, data: dataJson };
        } catch (error) {
            console.error('Erro ao salvar informações de pagamento:', error.message);
            return formatError(error);
        }
    }

    async saveSubAccountInfo(storeId, account) {
        try {
            console.log("saveSubAccountInfo - store", storeId);
            console.log("saveSubAccountInfo - account", account);
            
            if (!storeId) {
                return { success: false, message: 'ID da loja é obrigatório', status: 400 };
            }
            
            const [seller, created] = await Seller.upsert({
                nuvemshop_id: storeId,
                subaccount_id: account.id,
                subaccount_wallet_id: account.walletId,
                subaccount_api_key: account.apiKey,
                Asaas_cpfCnpj: account.cpfCnpj,
                Asaas_mobilePhone: account.mobilePhone,
                Asaas_site: account.site,
                Asaas_incomeValue: account.incomeValue,
                Asaas_address: account.address,
                Asaas_addressNumber: account.addressNumber,
                Asaas_province: account.province,
                Asaas_postalCode: account.postalCode,
                Asaas_loginEmail: account.loginEmail,
                Asaas_birthDate: account.birthDate
            });
            
            const dataJson = seller.dataValues;
            console.log('Seller store info updated:', dataJson);
            return { success: true, data: dataJson };
        } catch (error) {
            console.error('Erro ao salvar informações da subconta:', error.message);
            return formatError(error);
        }
    }

    async findByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                return { success: false, message: 'CPF/CNPJ é obrigatório', status: 400 };
            }
            
            const seller = await Seller.findOne({
                where: { Asaas_cpfCnpj: cpfCnpj }
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
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            // Valida se tem informações mínimas necessárias
            if (!seller.Asaas_cpfCnpj) {
                return { 
                    success: false, 
                    message: 'CPF/CNPJ é obrigatório para sincronizar com Asaas',
                    status: 400 
                };
            }
            
            // Mapeia dados do seller para o formato do Asaas
            const customerData = this._mapToAsaasCustomer(seller);
            
            // Cria ou atualiza o cliente no Asaas
            const result = await AsaasCustomerService.createOrUpdate(
                customerData, 
                AsaasCustomerService.SELLER_GROUP
            );
            
            if (result.success) {
                // Sempre atualiza o ID do customer no seller - importante para garantir que temos o ID correto
                await seller.update({ 
                    payments_customer_id: result.data.id 
                });
                
                // Recarregar o objeto depois da atualização
                await seller.reload();
                
                console.log(`Seller ID ${id} atualizado com payments_customer_id: ${result.data.id}`);
            }
            
            return { 
                success: result.success,
                data: {
                    seller: seller,
                    asaasCustomer: result.data
                },
                message: result.success ? 
                    'Vendedor sincronizado com sucesso no Asaas' : 
                    result.message
            };
        } catch (error) {
            console.error('Erro ao sincronizar vendedor com Asaas:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Método auxiliar para mapear os dados do Seller para o formato do Customer do Asaas
     * @private
     * @param {Object} seller - Objeto do modelo Seller
     * @returns {Object} - Dados no formato esperado pelo Asaas
     */
    _mapToAsaasCustomer(seller) {
        // Extrair info da loja do JSON
        const storeInfo = typeof seller.nuvemshop_info === 'string' 
            ? JSON.parse(seller.nuvemshop_info) 
            : seller.nuvemshop_info || {};
        
        // Montar objeto com os dados do Asaas
        return {
            name: storeInfo.name || storeInfo.storeName || 'Loja ' + seller.nuvemshop_id,
            cpfCnpj: seller.Asaas_cpfCnpj,
            email: seller.Asaas_loginEmail || storeInfo.email,
            mobilePhone: seller.Asaas_mobilePhone,
            address: seller.Asaas_address,
            addressNumber: seller.Asaas_addressNumber,
            province: seller.Asaas_province,
            postalCode: seller.Asaas_postalCode,
            externalReference: seller.nuvemshop_id.toString(),
            groupName: AsaasCustomerService.SELLER_GROUP,
            observations: `Vendedor da Nuvemshop ID: ${seller.nuvemshop_id}`,
            notificationDisabled: false
        };
    }
}

module.exports = new SellerService();