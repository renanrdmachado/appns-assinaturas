const Payment = require('../models/Payment');
const Order = require('../models/Order');
const SellerSubscription = require('../models/SellerSubscription');
const { formatError } = require('../utils/errorHandler');
const PaymentValidator = require('../validators/payment-validator');

class PaymentService {
    async get(id) {
        try {
            if (!id) {
                return null;
            }
            
            const payment = await Payment.findByPk(id);
            
            if (!payment) {
                return null;
            }
            
            // Buscar objeto relacionado (polimórfico)
            let relatedObject = null;
            if (payment.payable_type === 'order') {
                relatedObject = await Order.findByPk(payment.payable_id);
            } else if (payment.payable_type === 'seller_subscription') {
                relatedObject = await SellerSubscription.findByPk(payment.payable_id);
            }
            
            console.log("Service / Payment: ", payment.id);
            return { payment, relatedObject };
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
    
    async getByOrder(orderId) {
        try {
            // Verificar se o pedido existe
            const order = await Order.findByPk(orderId);
            if (!order) {
                return { 
                    success: false, 
                    message: 'Pedido não encontrado',
                    status: 404
                };
            }
            
            const payments = await Payment.findAll({
                where: { 
                    payable_type: 'order',
                    payable_id: orderId
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

    async createForOrder(orderId, data) {
        console.log('Payment for Order - creating...');
        try {
            // Verificar se o pedido existe
            const order = await Order.findByPk(orderId);
            if (!order) {
                return { 
                    success: false, 
                    message: 'Pedido não encontrado',
                    status: 404
                };
            }
            
            // Preparar dados completos para validação
            const paymentData = {
                ...data,
                payable_type: 'order',
                payable_id: orderId
            };
            
            // Validar dados do pagamento para pedido
            PaymentValidator.validateOrderPaymentData(paymentData);
            
            const payment = await Payment.create({
                external_id: data.external_id,
                payable_type: 'order',
                payable_id: orderId,
                order_id: orderId,
                status: data.status || 'pending',
                value: data.value,
                net_value: data.net_value,
                payment_date: data.payment_date,
                due_date: data.due_date,
                payment_method: data.payment_method,
                invoice_url: data.invoice_url,
                description: data.description,
                transaction_data: data.transaction_data
            });
            
            console.log('Payment created for Order:', payment.id);
            return { success: true, data: payment };
        } catch (error) {
            console.error('Erro ao criar pagamento para pedido:', error.message);
            return formatError(error);
        }
    }
    
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
                order_id: null, // Não tem order_id relacionado
                status: data.status || 'pending',
                value: data.value,
                net_value: data.net_value,
                payment_date: data.payment_date,
                due_date: data.due_date,
                payment_method: data.payment_method,
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
                return { 
                    success: false, 
                    message: `Pagamento com ID ${id} não encontrado`,
                    status: 404
                };
            }
            
            // Validar dados de atualização
            PaymentValidator.validatePaymentUpdateData(data);
            
            await payment.update(data);
            
            // Se o status foi atualizado para 'confirmed', atualizar o status do objeto relacionado
            if (data.status === 'confirmed') {
                if (payment.payable_type === 'order') {
                    const order = await Order.findByPk(payment.payable_id);
                    if (order) {
                        await order.update({ status: 'active' });
                    }
                } else if (payment.payable_type === 'seller_subscription') {
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
