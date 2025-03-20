const Shopper = require('../models/Shopper');
const { formatError } = require('../utils/errorHandler');
const ShopperValidator = require('../validators/shopper-validator');
const Order = require('../models/Order');

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
            
            const shopper = await Shopper.create(data);
            
            console.log('Shopper created:', shopper.id);
            return { success: true, data: shopper };
        } catch (error) {
            console.error('Erro ao criar comprador:', error.message);
            return formatError(error);
        }
    }
    
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
            
            await shopper.update(data);
            
            console.log('Shopper updated:', shopper.id);
            return { success: true, data: shopper };
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
}

module.exports = new ShopperService();
