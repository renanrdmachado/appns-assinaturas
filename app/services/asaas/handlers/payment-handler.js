/**
 * Handler para eventos relacionados a pagamentos recebidos pelo webhook da Asaas
 */
const Payment = require('../../../models/Payment');
const ShopperSubscriptionService = require('../../shopper-subscription.service');
const SellerSubscriptionService = require('../../seller-subscription.service');
const SellerService = require('../../seller.service');
const ShopperService = require('../../shopper.service');
const { formatError } = require('../../../utils/errorHandler');

/**
 * Mapeia os status de pagamento da Asaas para os status internos
 */
function mapAsaasStatusToPaymentStatus(status) {
    switch ((status || '').toUpperCase()) {
        case 'RECEIVED':
        case 'CONFIRMED':
            return 'confirmed';
        case 'OVERDUE':
            return 'overdue';
        case 'REFUNDED':
            return 'refunded';
        case 'CANCELED':
            return 'canceled';
        case 'FAILED':
            return 'failed';
        default:
            return 'pending';
    }
}

/**
 * Encontra a entidade (seller ou shopper) associada a um pagamento
 */
async function findEntityByPayment(paymentInfo) {
    try {
        // First priority: Check if payment belongs to a seller by customer ID
        if (paymentInfo.customer) {
            console.log(`Procurando vendedor com payments_customer_id: ${paymentInfo.customer}`);
            
            // Get all sellers to find one with matching customer ID
            const sellersResult = await SellerService.getAll();
            
            if (sellersResult.success && sellersResult.data && Array.isArray(sellersResult.data)) {
                const sellers = sellersResult.data;
                
                // Filter sellers to find one with matching payments_customer_id
                const sellerWithCustomerId = sellers.find(seller => 
                    seller.payments_customer_id && seller.payments_customer_id === paymentInfo.customer
                );
                
                if (sellerWithCustomerId) {
                    console.log(`Vendedor encontrado pelo ID do cliente ${paymentInfo.customer}: Vendedor ID ${sellerWithCustomerId.id}`);
                    return { entity: sellerWithCustomerId, type: 'seller' };
                } else {
                    console.log(`Nenhum vendedor encontrado com ID de cliente ${paymentInfo.customer}, verificando shoppers...`);
                    
                    // Check if payment belongs to a shopper
                    const shoppersResult = await ShopperService.getAll();
                    
                    if (shoppersResult.success && shoppersResult.data && Array.isArray(shoppersResult.data)) {
                        const shoppers = shoppersResult.data;
                        
                        const shopperWithCustomerId = shoppers.find(shopper => 
                            shopper.payments_customer_id && shopper.payments_customer_id === paymentInfo.customer
                        );
                        
                        if (shopperWithCustomerId) {
                            console.log(`Shopper encontrado pelo ID do cliente ${paymentInfo.customer}: Shopper ID ${shopperWithCustomerId.id}`);
                            return { entity: shopperWithCustomerId, type: 'shopper' };
                        }
                    }
                }
            }
        }

        // Second priority: Check if payment/subscription ID matches
        if (paymentInfo.id) {
            console.log(`Procurando por assinaturas com ID: ${paymentInfo.id}`);
            
            // Check seller subscriptions
            const sellerSubResult = await SellerSubscriptionService.getByExternalId(paymentInfo.id);
            if (sellerSubResult.success && sellerSubResult.data) {
                const sellerId = sellerSubResult.data.seller_id;
                const sellerResult = await SellerService.get(sellerId);
                
                if (sellerResult.success && sellerResult.data) {
                    console.log(`Assinatura de vendedor encontrada para pagamento ${paymentInfo.id}: Vendedor ID ${sellerId}`);
                    return { entity: sellerResult.data, type: 'seller' };
                }
            }
            
            // Check shopper subscriptions
            const shopperSubResult = await ShopperSubscriptionService.getByExternalId(paymentInfo.id);
            if (shopperSubResult.success && shopperSubResult.data) {
                const shopperId = shopperSubResult.data.shopper_id;
                const shopperResult = await ShopperService.get(shopperId);
                
                if (shopperResult.success && shopperResult.data) {
                    console.log(`Assinatura de shopper encontrada para pagamento ${paymentInfo.id}: Shopper ID ${shopperId}`);
                    return { entity: shopperResult.data, type: 'shopper' };
                }
            }
        }

        // Third priority: Try to extract information from description if it exists
        if (paymentInfo.description && paymentInfo.description.trim() !== '') {
            console.log(`Verificando campo de descrição: "${paymentInfo.description}"`);
            
            // If description is formatted to identify entity
            const sellerMatch = paymentInfo.description.match(/seller[_-]?id[:\s]?(\d+)/i);
            if (sellerMatch && sellerMatch[1]) {
                const sellerId = sellerMatch[1];
                const seller = await SellerService.get(sellerId);
                if (seller.success && seller.data) {
                    console.log(`Vendedor encontrado pela referência na descrição ${sellerId}: Vendedor ID ${seller.data.id}`);
                    return { entity: seller.data, type: 'seller' };
                }
            }
            
            const shopperMatch = paymentInfo.description.match(/shopper[_-]?id[:\s]?(\d+)/i);
            if (shopperMatch && shopperMatch[1]) {
                const shopperId = shopperMatch[1];
                const shopper = await ShopperService.get(shopperId);
                if (shopper.success && shopper.data) {
                    console.log(`Shopper encontrado pela referência na descrição ${shopperId}: Shopper ID ${shopper.data.id}`);
                    return { entity: shopper.data, type: 'shopper' };
                }
            }
        }

        // If no entity found
        console.warn(`Nenhuma entidade encontrada para o pagamento ID ${paymentInfo.id}, cliente ${paymentInfo.customer}`);
        return { entity: null, type: null };
    } catch (error) {
        console.error('Erro ao encontrar entidade para o pagamento:', error);
        throw error;
    }
}

/**
 * Cria ou atualiza um pagamento a partir dos dados recebidos do webhook
 */
async function createOrUpdatePaymentFromWebhook(paymentInfo) {
    try {
        let subscription = null;
        let payableType = null;
        
        // SellerSubscription
        let sellerSub = await SellerSubscriptionService.getByExternalId(paymentInfo.subscription);
        if (sellerSub.success && sellerSub.data) {
            subscription = sellerSub.data;
            payableType = 'seller_subscription';
        }
        
        // ShopperSubscription
        if (!subscription) {
            let shopperSub = await ShopperSubscriptionService.getByExternalId(paymentInfo.subscription);
            if (shopperSub.success && shopperSub.data) {
                subscription = shopperSub.data;
                payableType = 'shopper_subscription';
            }
        }
        
        if (!subscription || !payableType) return null;
        
        // Busca pagamento existente
        let payment = await Payment.findOne({ where: { external_id: paymentInfo.id } });
        const paymentData = {
            external_id: paymentInfo.id,
            payable_type: payableType,
            payable_id: subscription.id,
            status: mapAsaasStatusToPaymentStatus(paymentInfo.status),
            value: paymentInfo.value ?? 0,
            net_value: paymentInfo.netValue ?? null,
            payment_date: paymentInfo.paymentDate ? new Date(paymentInfo.paymentDate) : (paymentInfo.confirmedDate ? new Date(paymentInfo.confirmedDate) : null),
            due_date: paymentInfo.dueDate ? new Date(paymentInfo.dueDate) : null,
            // payment_method removido (redundante a billingType)
            invoice_url: paymentInfo.invoiceUrl ?? null,
            description: paymentInfo.description ?? null,
            transaction_data: paymentInfo
        };
        
        if (payment) {
            // Atualiza status e dados se mudou
            payment = await payment.update(paymentData);
        } else {
            payment = await Payment.create(paymentData);
        }
        
        // Atualiza status da assinatura se necessário
        if (paymentData.status === 'confirmed') {
            // Ativa a assinatura local
            if (payableType === 'shopper_subscription') {
                await ShopperSubscriptionService.updateStatusLocal(subscription.id, 'active');
                // Atualiza próxima cobrança se conhecida
                if (paymentInfo.dueDate) {
                    await ShopperSubscriptionService.update(subscription.id, { next_due_date: new Date(paymentInfo.dueDate) });
                }
            } else if (payableType === 'seller_subscription') {
                await SellerSubscriptionService.update(subscription.id, { status: 'active' });
                if (paymentInfo.dueDate) {
                    await SellerSubscriptionService.update(subscription.id, { next_due_date: new Date(paymentInfo.dueDate) });
                }
            }
        } else if (['overdue', 'canceled', 'refunded'].includes(paymentData.status)) {
            let assinaturaStatus = paymentData.status;
            if (assinaturaStatus === 'refunded') assinaturaStatus = 'canceled';
            if (payableType === 'shopper_subscription') {
                await ShopperSubscriptionService.updateStatusLocal(subscription.id, assinaturaStatus);
            } else if (payableType === 'seller_subscription') {
                await SellerSubscriptionService.update(subscription.id, { status: assinaturaStatus });
            }
        }
        
        return { payment, subscription, payableType };
    } catch (error) {
        console.error('Erro ao criar/atualizar pagamento:', error);
        return null;
    }
}

/**
 * Atualiza o status de pagamento para uma entidade
 */
async function updatePaymentStatus(entity, entityType, paymentInfo, status) {
    try {
        const updateData = { 
            payments_status: status,
            payments_last_update: new Date()
        };
        
        if (paymentInfo.dueDate) {
            updateData.payments_next_due = paymentInfo.dueDate;
        }

        if (entityType === 'seller') {
            // Update seller payment status
            const result = await SellerService.update(entity.id, updateData);
            if (result.success) {
                console.log(`Atualizado status de pagamento do vendedor ${entity.id} para ${status}`);
                return true;
            } else {
                console.error(`Erro ao atualizar status de pagamento do vendedor ${entity.id}:`, result.message);
                return false;
            }
        } else if (entityType === 'shopper') {
            // Shopper não mantém status agregado; não atualizar
            return true;
        } 
        return false;
    } catch (error) {
        console.error(`Erro ao atualizar status de pagamento para ${entityType} ${entity.id}:`, error);
        return false;
    }
}

/**
 * Handler para evento PAYMENT_CREATED
 */
async function handlePaymentCreated(eventData) {
    try {
        console.log(`Pagamento criado: ${eventData.payment.id}`);
        const paymentInfo = eventData.payment;
        const entityInfo = await findEntityByPayment(paymentInfo);
        
        if (entityInfo.entity) {
            await updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'PENDING');
            // Cria registro de pagamento
            await createOrUpdatePaymentFromWebhook(paymentInfo);
            
            return {
                success: true,
                status: 'PENDING',
                message: `Pagamento ${paymentInfo.id} criado para ${entityInfo.type} ${entityInfo.entity.id}`,
                entity: {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                }
            };
        } else {
            return {
                success: false,
                message: `Não foi possível associar o pagamento ${paymentInfo.id} a um cliente ou vendedor`
            };
        }
    } catch (error) {
        return formatError(error);
    }
}

/**
 * Handler para eventos PAYMENT_RECEIVED e PAYMENT_CONFIRMED
 */
async function handlePaymentConfirmed(eventData) {
    try {
        console.log(`Pagamento confirmado: ${eventData.payment.id}`);
        const paymentInfo = eventData.payment;
        const entityInfo = await findEntityByPayment(paymentInfo);
        
        if (entityInfo.entity) {
            await updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'RECEIVED');
            
            // Atualizar status da assinatura do shopper para 'active' se existir subscription
            if (entityInfo.type === 'shopper' && paymentInfo.subscription) {
                const subResult = await ShopperSubscriptionService.getByExternalId(paymentInfo.subscription);
                if (subResult.success && subResult.data) {
                    await ShopperSubscriptionService.update(subResult.data.id, { status: 'active' });
                }
            }
            
            // Cria registro de pagamento
            await createOrUpdatePaymentFromWebhook(paymentInfo);
            
            return {
                success: true,
                status: 'RECEIVED',
                message: `Pagamento ${paymentInfo.id} confirmado para ${entityInfo.type} ${entityInfo.entity.id}`,
                entity: {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                }
            };
        } else {
            return {
                success: false,
                message: `Não foi possível associar o pagamento confirmado ${paymentInfo.id} a um cliente ou vendedor`
            };
        }
    } catch (error) {
        return formatError(error);
    }
}

/**
 * Handler para evento PAYMENT_OVERDUE
 */
async function handlePaymentOverdue(eventData) {
    try {
        console.log(`Pagamento atrasado: ${eventData.payment.id}`);
        const paymentInfo = eventData.payment;
        const entityInfo = await findEntityByPayment(paymentInfo);
        
        if (entityInfo.entity) {
            await updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'OVERDUE');
            await createOrUpdatePaymentFromWebhook(paymentInfo);
            
            return {
                success: true,
                status: 'OVERDUE',
                message: `Pagamento ${paymentInfo.id} atrasado para ${entityInfo.type} ${entityInfo.entity.id}`,
                entity: {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                }
            };
        } else {
            return {
                success: false,
                message: `Não foi possível associar o pagamento atrasado ${paymentInfo.id} a um cliente ou vendedor`
            };
        }
    } catch (error) {
        return formatError(error);
    }
}

/**
 * Handler para evento PAYMENT_REFUNDED
 */
async function handlePaymentRefunded(eventData) {
    try {
        console.log(`Pagamento reembolsado: ${eventData.payment.id}`);
        const paymentInfo = eventData.payment;
        const entityInfo = await findEntityByPayment(paymentInfo);
        
        if (entityInfo.entity) {
            await updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'REFUNDED');
            await createOrUpdatePaymentFromWebhook(paymentInfo);
            
            return {
                success: true,
                status: 'REFUNDED',
                message: `Pagamento ${paymentInfo.id} reembolsado para ${entityInfo.type} ${entityInfo.entity.id}`,
                entity: {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                }
            };
        } else {
            return {
                success: false,
                message: `Não foi possível associar o pagamento reembolsado ${paymentInfo.id} a um cliente ou vendedor`
            };
        }
    } catch (error) {
        return formatError(error);
    }
}

/**
 * Handler para evento PAYMENT_CANCELED
 */
async function handlePaymentCanceled(eventData) {
    try {
        console.log(`Pagamento cancelado: ${eventData.payment.id}`);
        const paymentInfo = eventData.payment;
        const entityInfo = await findEntityByPayment(paymentInfo);
        
        if (entityInfo.entity) {
            await updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'CANCELED');
            await createOrUpdatePaymentFromWebhook(paymentInfo);
            
            return {
                success: true,
                status: 'CANCELED',
                message: `Pagamento ${paymentInfo.id} cancelado para ${entityInfo.type} ${entityInfo.entity.id}`,
                entity: {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                }
            };
        } else {
            return {
                success: false,
                message: `Não foi possível associar o pagamento cancelado ${paymentInfo.id} a um cliente ou vendedor`
            };
        }
    } catch (error) {
        return formatError(error);
    }
}

module.exports = {
    handlePaymentCreated,
    handlePaymentConfirmed,
    handlePaymentOverdue,
    handlePaymentRefunded,
    handlePaymentCanceled,
    findEntityByPayment,
    createOrUpdatePaymentFromWebhook,
    updatePaymentStatus
};