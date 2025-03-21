const SellerSubscription = require('../models/SellerSubscription');
const Seller = require('../models/Seller');
const { formatError } = require('../utils/errorHandler');

class SellerSubscriptionService {
    async get(id) {
        try {
            if (!id) {
                return null;
            }
            
            const subscription = await SellerSubscription.findByPk(id);
            console.log("Service / SellerSubscription: ", subscription ? subscription.id : 'not found');
            return subscription;
        } catch (error) {
            console.error('Erro ao buscar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const subscriptions = await SellerSubscription.findAll();
            
            console.log("Service / All SellerSubscriptions count: ", subscriptions.length);
            return subscriptions;
        } catch (error) {
            console.error('Erro ao buscar assinaturas de vendedores:', error.message);
            return formatError(error);
        }
    }
    
    async getBySellerId(sellerId) {
        try {
            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return { 
                    success: false, 
                    message: 'Vendedor não encontrado',
                    status: 404
                };
            }
            
            const subscriptions = await SellerSubscription.findAll({
                where: { seller_id: sellerId }
            });
            
            console.log(`Service / SellerSubscriptions for seller ${sellerId}: `, subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas para vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    async create(sellerId, data) {
        console.log('SellerSubscription - creating...');
        try {
            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            console.log('Seller:', seller ? seller.id : 'not found');
            if (!seller) {
                return { 
                    success: false, 
                    message: 'Vendedor não encontrado',
                    status: 404
                };
            }
            
            // Juntar o ID do vendedor com os dados da requisição
            const subscriptionData = {
                ...data,
                seller_id: sellerId
            };
            
            // Criar padrão para data de início
            if (!subscriptionData.start_date) {
                subscriptionData.start_date = new Date();
            }
            
            // Status padrão
            if (!subscriptionData.status) {
                subscriptionData.status = 'pending';
            }
            
            const subscription = await SellerSubscription.create(subscriptionData);
            
            console.log('SellerSubscription created:', subscription.id);
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao criar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            const subscription = await SellerSubscription.findByPk(id);
            
            if (!subscription) {
                return { 
                    success: false, 
                    message: `Assinatura com ID ${id} não encontrada`,
                    status: 404
                };
            }
            
            await subscription.update(data);
            
            console.log('SellerSubscription updated:', subscription.id);
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao atualizar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            const subscription = await SellerSubscription.findByPk(id);
            
            if (!subscription) {
                return { 
                    success: false, 
                    message: `Assinatura com ID ${id} não encontrada`,
                    status: 404
                };
            }
            
            await subscription.destroy();
            console.log(`Assinatura com ID ${id} foi excluída com sucesso`);
            return { success: true, message: `Assinatura com ID ${id} foi excluída com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerSubscriptionService();
