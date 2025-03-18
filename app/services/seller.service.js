const Seller = require('../models/Seller');
const { formatError } = require('../utils/errorHandler');

class SellerService {
    async get(id) {
        try {
            if (!id) {
                return null;
            }
            
            const seller = await Seller.findByPk(id);
            console.log("Service / Seller: ", seller);
            return seller;
        } catch (error) {
            console.error('Erro ao buscar vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async getByNuvemshopId(nuvemshopId) {
        try {
            if (!nuvemshopId) {
                return null;
            }
            
            const seller = await Seller.findOne({
                where: { nuvemshop_id: nuvemshopId }
            });
            
            console.log("Service / Seller by nuvemshop_id: ", seller);
            return seller;
        } catch (error) {
            console.error('Erro ao buscar vendedor por nuvemshop_id:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const sellers = await Seller.findAll();
            console.log("Service / All Sellers count: ", sellers.length);
            return sellers;
        } catch (error) {
            console.error('Erro ao buscar vendedores:', error.message);
            return formatError(error);
        }
    }

    async create(data) {
        console.log("Seller - creating...");
        
        try {
            if (!data.nuvemshop_id) {
                throw new Error('nuvemshop_id é obrigatório');
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
            
            return seller;
        } catch (error) {
            console.error('Erro ao criar vendedor - service:', error.message);
            return formatError(error);
        }
    }

    async updateStoreInfo(nuvemshopId, api_token, storeInfo) {
        try {
            const nuvemshopInfo = typeof storeInfo === 'string' 
                ? storeInfo 
                : JSON.stringify(storeInfo);
            
            let seller = await Seller.upsert({
                nuvemshop_id: nuvemshopId,
                nuvemshop_info: nuvemshopInfo,
                nuvemshop_api_token: api_token
            });
            
            if (!seller) {
                throw new Error(`Vendedor com ID ${nuvemshopId} não encontrado`);
            }
            
            return seller;
        } catch (error) {
            console.error('Erro ao atualizar informações da loja:', error.message);
            return formatError(error);
        }
    }

    async update(id, data) {
        try {
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                throw new Error(`Vendedor com ID ${id} não encontrado`);
            }
            
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            await seller.update(data);
            
            console.log('Seller updated:', seller.dataValues);
            return seller;
        } catch (error) {
            console.error('Erro ao atualizar vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                throw new Error(`Vendedor com ID ${id} não encontrado`);
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
            return dataJson;
        } catch (error) {
            console.error('Erro ao salvar informações de pagamento:', error.message);
            return formatError(error);
        }
    }

    async saveSubAccountInfo(storeId, account) {
        try {
            console.log("saveSubAccountInfo - store", storeId);
            console.log("saveSubAccountInfo - account", account);
            
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
            return dataJson;
        } catch (error) {
            console.error('Erro ao salvar informações da subconta:', error.message);
            return formatError(error);
        }
    }

    /**
     * Find a seller by CPF/CNPJ (stored in Asaas_cpfCnpj)
     * @param {string} cpfCnpj
     * @returns {Promise<Seller|null>}
     */
    async findByCpfCnpj(cpfCnpj) {
        if (!cpfCnpj) {
            return null;
        }
        return Seller.findOne({
            where: { Asaas_cpfCnpj: cpfCnpj }
        });
    }
}

module.exports = new SellerService();