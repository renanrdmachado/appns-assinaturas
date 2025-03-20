const Seller = require('../models/Seller');
const { formatError } = require('../utils/errorHandler');

class SellerService {
    async get(id) {
        try {
            if (!id) {
                return { success: false, message: 'ID é obrigatório', status: 400 };
            }
            
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
            if (!nuvemshopId) {
                return { success: false, message: 'ID da Nuvemshop é obrigatório', status: 400 };
            }
            
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

    async create(data) {
        console.log("Seller - creating...");
        
        try {
            if (!data.nuvemshop_id) {
                return { success: false, message: 'nuvemshop_id é obrigatório', status: 400 };
            }
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            const [seller, created] = await Seller.findOrCreate({
                where: { nuvemshop_id: data.nuvemshop_id },
                defaults: data
            });
            
            if (!created) {
                await seller.update(data);
            }
            
            return { success: true, data: seller };
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

    async update(id, data) {
        try {
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            await seller.update(data);
            
            console.log('Seller updated:', seller.dataValues);
            return { success: true, data: seller };
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

    async getSubscriptions(id) {
        try {
            if (!id) {
                return { success: false, message: 'ID é obrigatório', status: 400 };
            }
            
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            // Verifica se há informações de assinatura
            const subscriptionData = {
                subscriptionId: seller.payments_subscription_id,
                customerId: seller.payments_customer_id,
                nextDueDate: seller.payments_next_due,
                status: seller.payments_status,
                appStatus: seller.app_status
            };
            
            return { success: true, data: subscriptionData };
        } catch (error) {
            console.error('Erro ao buscar assinaturas do vendedor:', error.message);
            return formatError(error);
        }
    }

    async addSubscription(id, subscriptionData) {
        try {
            if (!id) {
                return { success: false, message: 'ID é obrigatório', status: 400 };
            }
            
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                return { success: false, message: `Vendedor com ID ${id} não encontrado`, status: 404 };
            }
            
            // Atualiza as informações de assinatura
            await seller.update({
                payments_customer_id: subscriptionData.customerId,
                payments_subscription_id: subscriptionData.subscriptionId,
                payments_next_due: subscriptionData.nextDueDate,
                payments_status: subscriptionData.status || "PENDING",
                app_status: subscriptionData.appStatus
            });
            
            const updatedData = {
                subscriptionId: seller.payments_subscription_id,
                customerId: seller.payments_customer_id,
                nextDueDate: seller.payments_next_due,
                status: seller.payments_status,
                appStatus: seller.app_status
            };
            
            return { success: true, data: updatedData };
        } catch (error) {
            console.error('Erro ao adicionar assinatura ao vendedor:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerService();