require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const SellerService = require('../seller.service');
const ShopperService = require('../shopper.service');
const SellerSubscriptionService = require('../seller-subscription.service');
const ShopperSubscriptionService = require('../shopper-subscription.service');
const { formatError, createError } = require('../../utils/errorHandler');
const Payment = require('../../models/Payment');

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

async function createOrUpdatePaymentFromWebhook(paymentInfo) {
    let subscription = null;
    let payableType = null;
    // SellerSubscription
    let sellerSub = await require('../seller-subscription.service').getByExternalId(paymentInfo.subscription);
    if (sellerSub.success && sellerSub.data) {
        subscription = sellerSub.data;
        payableType = 'seller_subscription';
    }
    // ShopperSubscription
    if (!subscription) {
        let shopperSub = await require('../shopper-subscription.service').getByExternalId(paymentInfo.subscription);
        if (shopperSub.success && shopperSub.data) {
            subscription = shopperSub.data;
            payableType = 'shopper_subscription';
        }
    }
    if (!subscription || !payableType) return;
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
        payment_method: paymentInfo.billingType ?? null,
        invoice_url: paymentInfo.invoiceUrl ?? null,
        description: paymentInfo.description ?? null,
        transaction_data: paymentInfo
    };
    if (payment) {
        // Atualiza status e dados se mudou
        await payment.update(paymentData);
    } else {
        await Payment.create(paymentData);
    }
    // Atualiza status da assinatura se necessário
    if (paymentData.status === 'confirmed') {
        // Ativa a assinatura
        if (payableType === 'shopper_subscription') {
            await require('../shopper-subscription.service').update(subscription.id, { status: 'active' });
        } else if (payableType === 'seller_subscription') {
            await require('../seller-subscription.service').update(subscription.id, { status: 'active' });
        }
    } else if (['overdue','canceled','refunded'].includes(paymentData.status)) {
        let assinaturaStatus = paymentData.status;
        if (assinaturaStatus === 'refunded') assinaturaStatus = 'canceled';
        if (payableType === 'shopper_subscription') {
            await require('../shopper-subscription.service').update(subscription.id, { status: assinaturaStatus });
        } else if (payableType === 'seller_subscription') {
            await require('../seller-subscription.service').update(subscription.id, { status: assinaturaStatus });
        }
    }
}

class WebhookService {
    async registerWebhook(webhookData) {
        try {
            // Validar dados do webhook
            if (!webhookData.url) {
                return createError('URL é obrigatória para o webhook', 400);
            }

            // Garantir que 'events' seja fornecido como um array
            if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
                return createError('Pelo menos um evento deve ser especificado', 400);
            }

            // Definir valores padrão se não forem fornecidos
            const webhook = {
                name: webhookData.name || 'Assinaturas App Webhook',
                url: webhookData.url,
                email: webhookData.email,
                enabled: webhookData.enabled !== undefined ? webhookData.enabled : true,
                interrupted: webhookData.interrupted !== undefined ? webhookData.interrupted : false,
                authToken: webhookData.authToken || null,
                sendType: webhookData.sendType || 'SEQUENTIALLY',
                events: webhookData.events
            };

            const created = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'webhooks',
                data: webhook
            });

            return { success: true, data: created };
        } catch (error) {
            console.error('Erro ao registrar webhook:', error);
            return formatError(error);
        }
    }

    async getWebhooks() {
        try {
            const webhooks = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'webhooks'
            });
            return { success: true, data: webhooks };
        } catch (error) {
            console.error('Erro ao listar webhooks:', error);
            return formatError(error);
        }
    }

    async getWebhookById(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }
            
            const webhook = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `webhooks/${id}`
            });
            
            return { success: true, data: webhook };
        } catch (error) {
            console.error(`Erro ao buscar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async updateWebhook(id, webhookData) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `webhooks/${id}`,
                data: webhookData
            });

            return { success: true, data: updated };
        } catch (error) {
            console.error(`Erro ao atualizar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async deleteWebhook(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `webhooks/${id}`
            });

            return { success: true, message: 'Webhook excluído com sucesso' };
        } catch (error) {
            console.error(`Erro ao excluir webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async processWebhookEvent(eventData) {
        try {
            // Registrar o evento de webhook
            console.log('Webhook event received:', JSON.stringify(eventData));
            
            if (!eventData.payment || !eventData.payment.id) {
                return createError('Dados de webhook inválidos: Informações de pagamento ausentes', 400);
            }

            // Encontrar a entidade relacionada (vendedor ou cliente) com base nas informações de pagamento
            const paymentInfo = eventData.payment;
            const entityInfo = await this.findEntityByPayment(paymentInfo);
            
            let result = {
                success: true,
                event: eventData.event,
                paymentId: paymentInfo.id,
                entity: entityInfo.entity ? {
                    id: entityInfo.entity.id,
                    type: entityInfo.type
                } : null,
                status: null,
                message: ''
            };

            // Processar o evento de webhook com base em seu tipo
            switch(eventData.event) {
                case 'PAYMENT_CREATED':
                    console.log(`Pagamento criado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'PENDING');
                        // Cria registro de pagamento
                        await createOrUpdatePaymentFromWebhook(paymentInfo);
                        result.status = 'PENDING';
                        result.message = `Pagamento ${paymentInfo.id} criado para ${entityInfo.type} ${entityInfo.entity.id}`;
                    } else {
                        result.success = false;
                        result.message = `Não foi possível associar o pagamento ${paymentInfo.id} a um cliente ou vendedor`;
                    }
                    break;
                    
                case 'PAYMENT_RECEIVED':
                case 'PAYMENT_CONFIRMED':
                    console.log(`Pagamento confirmado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'RECEIVED');
                        // Atualizar status da assinatura do shopper para 'active' se existir subscription
                        if (entityInfo.type === 'shopper' && paymentInfo.subscription) {
                            const subResult = await require('../shopper-subscription.service').getByExternalId(paymentInfo.subscription);
                            if (subResult.success && subResult.data) {
                                await require('../shopper-subscription.service').update(subResult.data.id, { status: 'active' });
                            }
                        }
                        // Cria registro de pagamento
                        await createOrUpdatePaymentFromWebhook(paymentInfo);
                        result.status = 'RECEIVED';
                        result.message = `Pagamento ${paymentInfo.id} confirmado para ${entityInfo.type} ${entityInfo.entity.id}`;
                    } else {
                        result.success = false;
                        result.message = `Não foi possível associar o pagamento confirmado ${paymentInfo.id} a um cliente ou vendedor`;
                    }
                    break;
                    
                case 'PAYMENT_OVERDUE':
                    console.log(`Pagamento atrasado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'OVERDUE');
                        result.status = 'OVERDUE';
                        result.message = `Pagamento ${paymentInfo.id} atrasado para ${entityInfo.type} ${entityInfo.entity.id}`;
                    } else {
                        result.success = false;
                        result.message = `Não foi possível associar o pagamento atrasado ${paymentInfo.id} a um cliente ou vendedor`;
                    }
                    break;
                
                case 'PAYMENT_REFUNDED':
                    console.log(`Pagamento reembolsado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'REFUNDED');
                        result.status = 'REFUNDED';
                        result.message = `Pagamento ${paymentInfo.id} reembolsado para ${entityInfo.type} ${entityInfo.entity.id}`;
                    } else {
                        result.success = false;
                        result.message = `Não foi possível associar o pagamento reembolsado ${paymentInfo.id} a um cliente ou vendedor`;
                    }
                    break;
                
                default:
                    result.success = true;
                    result.message = `Evento ${eventData.event} recebido, mas não requer processamento especial`;
                    console.log(`Evento não processado especificamente: ${eventData.event}`);
            }
            
            return result;
        } catch (error) {
            console.error('Erro ao processar webhook:', error);
            return formatError(error);
        }
    }

    /**
     * Find an entity (seller or shopper) related to a payment
     * @param {Object} paymentInfo - Payment information from webhook
     * @returns {Object} Object containing entity and type ('seller', 'shopper' or null)
     */
    async findEntityByPayment(paymentInfo) {
        try {
            // First priority: Check if payment belongs to a seller by customer ID
            if (paymentInfo.customer) {
                console.log(`Procurando vendedor com payments_customer_id: ${paymentInfo.customer}`);
                
                // Get all sellers to find one with matching customer ID
                const sellersResult = await SellerService.getAll();
                
                if (sellersResult.success && sellersResult.data && Array.isArray(sellersResult.data) && sellersResult.data.length > 0) {
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
                        
                        if (shoppersResult.success && shoppersResult.data && Array.isArray(shoppersResult.data) && shoppersResult.data.length > 0) {
                            const shoppers = shoppersResult.data;
                            
                            const shopperWithCustomerId = shoppers.find(shopper => 
                                shopper.payments_customer_id && shopper.payments_customer_id === paymentInfo.customer
                            );
                            
                            if (shopperWithCustomerId) {
                                console.log(`Shopper encontrado pelo ID do cliente ${paymentInfo.customer}: Shopper ID ${shopperWithCustomerId.id}`);
                                return { entity: shopperWithCustomerId, type: 'shopper' };
                            } else {
                                console.log(`Nenhum shopper encontrado com ID de cliente ${paymentInfo.customer}`);
                            }
                        }
                    }
                } else {
                    console.log('Não foi possível recuperar vendedores da base de dados');
                }
            } else {
                console.log('Aviso: Informação de pagamento não contém ID do cliente');
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
                
                console.log(`Nenhuma assinatura encontrada para ID de pagamento ${paymentInfo.id}`);
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
     * Update payment status for an entity
     * @param {Object} entity - The entity object (seller or shopper)
     * @param {string} entityType - Type of entity ('seller' or 'shopper')
     * @param {Object} paymentInfo - Payment information
     * @param {string} status - New payment status
     */
    async updatePaymentStatus(entity, entityType, paymentInfo, status) {
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
                // Update shopper payment status
                const result = await ShopperService.update(entity.id, updateData);
                if (result.success) {
                    console.log(`Atualizado status de pagamento do shopper ${entity.id} para ${status}`);
                    return true;
                } else {
                    console.error(`Erro ao atualizar status de pagamento do shopper ${entity.id}:`, result.message);
                    return false;
                }
            } 
            return false;
        } catch (error) {
            console.error(`Erro ao atualizar status de pagamento para ${entityType} ${entity.id}:`, error);
            return false;
        }
    }
}

module.exports = new WebhookService();
