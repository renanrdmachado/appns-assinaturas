const Seller = require('../models/Seller');

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
            throw error;
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
            throw error;
        }
    }
    
    async getAll() {
        try {
            const sellers = await Seller.findAll();
            console.log("Service / All Sellers count: ", sellers.length);
            return sellers;
        } catch (error) {
            console.error('Erro ao buscar vendedores:', error.message);
            throw error;
        }
    }

    async create(data) {
        console.log("Seller - creating...");
        
        try {
            // Garantir que nuvemshop_id está presente
            if (!data.nuvemshop_id) {
                throw new Error('nuvemshop_id é obrigatório');
            }
            
            // Transforma o objeto nuvemshop_info para string se não for string
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            // Usar o método findOrCreate do sequelize
            const [seller, created] = await Seller.findOrCreate({
                where: { nuvemshop_id: data.nuvemshop_id },
                defaults: data
            });
            
            if (!created) {
                // Se o vendedor já existia, atualiza os dados
                await seller.update(data);
            }
            
            return seller;
        } catch (error) {
            console.error('Erro ao criar vendedor:', error.message);
            throw error;
        }
    }

    async updateStoreInfo(nuvemshopId, storeInfo) {
        try {
            // Converte as informações da loja para string se não for string
            const nuvemshopInfo = typeof storeInfo === 'string' 
                ? storeInfo 
                : JSON.stringify(storeInfo);
            
            // Atualiza o vendedor com as informações da loja
            const seller = await Seller.findOne({ 
                where: { nuvemshop_id: nuvemshopId } 
            });
            
            if (!seller) {
                throw new Error(`Vendedor com ID ${nuvemshopId} não encontrado`);
            }
            
            await seller.update({ nuvemshop_info: nuvemshopInfo });
            
            return seller;
        } catch (error) {
            console.error('Erro ao atualizar informações da loja:', error.message);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const seller = await Seller.findByPk(id);
            
            if (!seller) {
                throw new Error(`Vendedor com ID ${id} não encontrado`);
            }
            
            // Transforma o objeto nuvemshop_info para string se não for string
            if (data.nuvemshop_info && typeof data.nuvemshop_info !== 'string') {
                data.nuvemshop_info = JSON.stringify(data.nuvemshop_info);
            }
            
            await seller.update(data);
            
            console.log('Seller updated:', seller.dataValues);
            return seller;
        } catch (error) {
            console.error('Erro ao atualizar vendedor:', error.message);
            throw error;
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
            return true;
        } catch (error) {
            console.error('Erro ao excluir vendedor:', error.message);
            throw error;
        }
    }
}

module.exports = new SellerService();
