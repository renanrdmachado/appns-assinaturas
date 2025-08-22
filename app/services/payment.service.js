const Payment = require('../models/Payment');
const SellerSubscription = require('../models/SellerSubscription');
const ShopperSubscription = require('../models/ShopperSubscription');
const { formatError, createError } = require('../utils/errorHandler');
const PaymentValidator = require('../validators/payment-validator');

class PaymentService {
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const payment = await Payment.findByPk(id);
            
            if (!payment) {
                return createError(`Pagamento com ID ${id} não encontrado`, 404);
            }
            
            // Buscar objeto relacionado (polimórfico)
            let relatedObject = null;
            if (payment.payable_type === 'seller_subscription') {
                relatedObject = await SellerSubscription.findByPk(payment.payable_id);
            } else if (payment.payable_type === 'shopper_subscription') {
                relatedObject = await ShopperSubscription.findByPk(payment.payable_id);
            }
            
            console.log("Service / Payment: ", payment.id);
            return { success: true, data: { payment, relatedObject } };
        } catch (error) {
            console.error('Erro ao buscar pagamento:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const payments = await Payment.findAll();
            
            console.log("Service / All Payments count: ", payments.length);
            return payments;
        } catch (error) {
            console.error('Erro ao buscar pagamentos:', error.message);
            return formatError(error);
        }
    }
    
    // Compat: listar pagamentos de um pedido resolvendo via ShopperSubscription
    async getByOrder(orderId) {
        try {
            if (!orderId) {
                return createError('order_id é obrigatório', 400);
            }
            // Coleta as assinaturas de shopper vinculadas ao pedido
            const subs = await ShopperSubscription.findAll({ where: { order_id: orderId } });
            if (!subs || subs.length === 0) {
                return { success: true, data: [] };
            }
            const subIds = subs.map(s => s.id);
            const payments = await Payment.findAll({
                where: {
                    payable_type: 'shopper_subscription',
                    payable_id: subIds
                }
            });
            console.log(`Service / Payments for order ${orderId}: `, payments.length);
            return { success: true, data: payments };
        } catch (error) {
            console.error(`Erro ao buscar pagamentos para pedido ${orderId}:`, error.message);
            return formatError(error);
        }
    }
    
    async getBySellerSubscription(subscriptionId) {
        try {
            // Verificar se a assinatura existe
            const subscription = await SellerSubscription.findByPk(subscriptionId);
            if (!subscription) {
                return { 
                    success: false, 
                    message: 'Assinatura não encontrada',
                    status: 404
                };
            }
            
            const payments = await Payment.findAll({
                where: { 
                    payable_type: 'seller_subscription',
                    payable_id: subscriptionId
                }
            });
            
            console.log(`Service / Payments for subscription ${subscriptionId}: `, payments.length);
            return { success: true, data: payments };
        } catch (error) {
            console.error(`Erro ao buscar pagamentos para assinatura ${subscriptionId}:`, error.message);
            return formatError(error);
        }
    }

    // Removido: criação de pagamento para Order
    
    async createForSellerSubscription(subscriptionId, data) {
        console.log('Payment for SellerSubscription - creating...');
        try {
            // Verificar se a assinatura existe
            const subscription = await SellerSubscription.findByPk(subscriptionId);
            if (!subscription) {
                return { 
                    success: false, 
                    message: 'Assinatura não encontrada',
                    status: 404
                };
            }
            
            // Preparar dados completos para validação
            const paymentData = {
                ...data,
                payable_type: 'seller_subscription',
                payable_id: subscriptionId
            };
            
            // Validar dados do pagamento para assinatura
            PaymentValidator.validateSubscriptionPaymentData(paymentData);
            
            const payment = await Payment.create({
                external_id: data.external_id,
                payable_type: 'seller_subscription',
                payable_id: subscriptionId,
                // Removida a referência a order_id
                status: data.status || 'pending',
                value: data.value,
                net_value: data.net_value,
                payment_date: data.payment_date,
                due_date: data.due_date,
                invoice_url: data.invoice_url,
                description: data.description,
                transaction_data: data.transaction_data
            });
            
            console.log('Payment created for SellerSubscription:', payment.id);
            return { success: true, data: payment };
        } catch (error) {
            console.error('Erro ao criar pagamento para assinatura:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            const payment = await Payment.findByPk(id);
            
            if (!payment) {
                return createError(`Pagamento com ID ${id} não encontrado`, 404);
            }
            
            // Validar dados de atualização
            try {
                PaymentValidator.validatePaymentUpdateData(data);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            await payment.update(data);
            
            // Se o status foi atualizado para 'confirmed', atualizar o status da assinatura do seller
            if (data.status === 'confirmed') {
                if (payment.payable_type === 'seller_subscription') {
                    const subscription = await SellerSubscription.findByPk(payment.payable_id);
                    if (subscription) {
                        await subscription.update({ status: 'active' });
                    }
                }
            }
            
            console.log('Payment updated:', payment.id);
            return { success: true, data: payment };
        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new PaymentService();
