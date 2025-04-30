/**
 * Handler para eventos relacionados a assinaturas recebidos pelo webhook da Asaas
 */
const ShopperSubscriptionService = require('../../shopper-subscription.service');
const SellerSubscriptionService = require('../../seller-subscription.service');
const ShopperSubscription = require('../../../models/ShopperSubscription');
const SellerSubscription = require('../../../models/SellerSubscription');
const { formatError } = require('../../../utils/errorHandler');

/**
 * Handler para o evento SUBSCRIPTION_DELETED
 * Aplica soft delete às assinaturas locais ao invés de excluí-las definitivamente
 * @param {Object} eventData - Dados do evento recebido pelo webhook
 * @returns {Object} Resultado do processamento
 */
async function handleSubscriptionDeleted(eventData) {
    try {
        console.log(`Processando evento SUBSCRIPTION_DELETED para assinatura ID ${eventData.subscription.id}`);
        
        const subscriptionId = eventData.subscription.id;
        let found = false;
        let type = null;
        
        // 1. Verificar se é uma assinatura de vendedor
        const sellerSubResult = await SellerSubscriptionService.getByExternalId(subscriptionId);
        if (sellerSubResult.success && sellerSubResult.data) {
            found = true;
            type = 'seller_subscription';
            
            // Aplicar soft delete à assinatura do vendedor
            await SellerSubscriptionService.update(sellerSubResult.data.id, {
                status: 'inactive',
                end_date: new Date()
            });
            
            // Soft delete via paranoid
            await SellerSubscription.destroy({
                where: { id: sellerSubResult.data.id }
            });
            
            console.log(`Assinatura de vendedor ID ${sellerSubResult.data.id} marcada como excluída (soft delete)`);
        }
        
        // 2. Se não for vendedor, verificar se é uma assinatura de shopper
        if (!found) {
            const shopperSubResult = await ShopperSubscriptionService.getByExternalId(subscriptionId);
            if (shopperSubResult.success && shopperSubResult.data) {
                found = true;
                type = 'shopper_subscription';
                
                // Aplicar soft delete à assinatura do shopper
                await ShopperSubscriptionService.update(shopperSubResult.data.id, {
                    status: 'inactive',
                    end_date: new Date()
                });
                
                // Soft delete via paranoid
                await ShopperSubscription.destroy({
                    where: { id: shopperSubResult.data.id }
                });
                
                console.log(`Assinatura de shopper ID ${shopperSubResult.data.id} marcada como excluída (soft delete)`);
            }
        }
        
        if (!found) {
            return {
                success: true,
                event: eventData.event,
                subscriptionId: subscriptionId,
                message: `Assinatura ${subscriptionId} não encontrada no sistema local`
            };
        }
        
        return {
            success: true,
            event: eventData.event,
            subscriptionId: subscriptionId,
            type: type,
            message: `Assinatura ${subscriptionId} marcada como excluída com sucesso (soft delete)`
        };
    } catch (error) {
        console.error('Erro ao processar exclusão de assinatura:', error);
        return formatError(error);
    }
}

/**
 * Handler para o evento SUBSCRIPTION_RENEWED
 * Atualiza os dados da assinatura local quando uma assinatura é renovada
 * @param {Object} eventData - Dados do evento recebido pelo webhook
 * @returns {Object} Resultado do processamento
 */
async function handleSubscriptionRenewed(eventData) {
    try {
        console.log(`Processando evento SUBSCRIPTION_RENEWED para assinatura ID ${eventData.subscription.id}`);
        
        const subscriptionId = eventData.subscription.id;
        let found = false;
        let type = null;
        
        // 1. Verificar se é uma assinatura de vendedor
        const sellerSubResult = await SellerSubscriptionService.getByExternalId(subscriptionId);
        if (sellerSubResult.success && sellerSubResult.data) {
            found = true;
            type = 'seller_subscription';
            
            // Atualizar data de vencimento e ciclo
            await SellerSubscriptionService.update(sellerSubResult.data.id, {
                next_due_date: new Date(eventData.subscription.nextDueDate),
                cycle: eventData.subscription.cycle
            });
            
            console.log(`Assinatura de vendedor ID ${sellerSubResult.data.id} atualizada com nova data de vencimento`);
        }
        
        // 2. Se não for vendedor, verificar se é uma assinatura de shopper
        if (!found) {
            const shopperSubResult = await ShopperSubscriptionService.getByExternalId(subscriptionId);
            if (shopperSubResult.success && shopperSubResult.data) {
                found = true;
                type = 'shopper_subscription';
                
                // Atualizar data de vencimento e ciclo
                await ShopperSubscriptionService.update(shopperSubResult.data.id, {
                    next_due_date: new Date(eventData.subscription.nextDueDate),
                    cycle: eventData.subscription.cycle
                });
                
                console.log(`Assinatura de shopper ID ${shopperSubResult.data.id} atualizada com nova data de vencimento`);
            }
        }
        
        if (!found) {
            return {
                success: true,
                event: eventData.event,
                subscriptionId: subscriptionId,
                message: `Assinatura ${subscriptionId} não encontrada no sistema local`
            };
        }
        
        return {
            success: true,
            event: eventData.event,
            subscriptionId: subscriptionId,
            type: type,
            message: `Assinatura ${subscriptionId} renovada com sucesso`
        };
    } catch (error) {
        console.error('Erro ao processar renovação de assinatura:', error);
        return formatError(error);
    }
}

/**
 * Handler para o evento SUBSCRIPTION_UPDATED
 * Atualiza as informações de uma assinatura no sistema local
 * @param {Object} eventData - Dados do evento recebido pelo webhook
 * @returns {Object} Resultado do processamento
 */
async function handleSubscriptionUpdated(eventData) {
    try {
        console.log(`Processando evento SUBSCRIPTION_UPDATED para assinatura ID ${eventData.subscription.id}`);
        
        const subscriptionId = eventData.subscription.id;
        let found = false;
        let type = null;
        
        // Extrair dados da assinatura
        const subData = {
            value: eventData.subscription.value,
            status: eventData.subscription.status === 'ACTIVE' ? 'active' : 'inactive',
            cycle: eventData.subscription.cycle,
            next_due_date: new Date(eventData.subscription.nextDueDate),
            billing_type: eventData.subscription.billingType
        };
        
        // 1. Verificar se é uma assinatura de vendedor
        const sellerSubResult = await SellerSubscriptionService.getByExternalId(subscriptionId);
        if (sellerSubResult.success && sellerSubResult.data) {
            found = true;
            type = 'seller_subscription';
            
            await SellerSubscriptionService.update(sellerSubResult.data.id, subData);
            console.log(`Assinatura de vendedor ID ${sellerSubResult.data.id} atualizada`);
        }
        
        // 2. Se não for vendedor, verificar se é uma assinatura de shopper
        if (!found) {
            const shopperSubResult = await ShopperSubscriptionService.getByExternalId(subscriptionId);
            if (shopperSubResult.success && shopperSubResult.data) {
                found = true;
                type = 'shopper_subscription';
                
                await ShopperSubscriptionService.update(shopperSubResult.data.id, subData);
                console.log(`Assinatura de shopper ID ${shopperSubResult.data.id} atualizada`);
            }
        }
        
        if (!found) {
            return {
                success: true,
                event: eventData.event,
                subscriptionId: subscriptionId,
                message: `Assinatura ${subscriptionId} não encontrada no sistema local`
            };
        }
        
        return {
            success: true,
            event: eventData.event,
            subscriptionId: subscriptionId,
            type: type,
            message: `Assinatura ${subscriptionId} atualizada com sucesso`
        };
    } catch (error) {
        console.error('Erro ao processar atualização de assinatura:', error);
        return formatError(error);
    }
}

module.exports = {
    handleSubscriptionDeleted,
    handleSubscriptionRenewed,
    handleSubscriptionUpdated
};