/**
 * Fábrica de handlers para eventos de webhook Asaas
 * Implementa o padrão Factory para direcionar eventos aos manipuladores específicos
 */
const paymentHandler = require('./payment-handler');
const subscriptionHandler = require('./subscription-handler');
const { formatError } = require('../../../utils/errorHandler');

/**
 * Lista de eventos suportados e seus handlers correspondentes
 */
const EVENT_HANDLERS = {
    // Eventos de pagamento
    'PAYMENT_CREATED': (eventData) => paymentHandler.handlePaymentCreated(eventData),
    'PAYMENT_RECEIVED': (eventData) => paymentHandler.handlePaymentConfirmed(eventData),
    'PAYMENT_CONFIRMED': (eventData) => paymentHandler.handlePaymentConfirmed(eventData),
    'PAYMENT_OVERDUE': (eventData) => paymentHandler.handlePaymentOverdue(eventData),
    'PAYMENT_REFUNDED': paymentHandler.handlePaymentRefunded,
    'PAYMENT_CANCELED': paymentHandler.handlePaymentCanceled,
    
    // Eventos de assinatura
    'SUBSCRIPTION_DELETED': (eventData) => subscriptionHandler.handleSubscriptionDeleted(eventData),
    'SUBSCRIPTION_RENEWED': (eventData) => subscriptionHandler.handleSubscriptionRenewed(eventData),
    'SUBSCRIPTION_UPDATED': (eventData) => subscriptionHandler.handleSubscriptionUpdated(eventData)
};

class EventHandlerFactory {
    /**
     * Processa um evento recebido pelo webhook
     * @param {Object} eventData - Dados do evento recebido pelo webhook
     * @returns {Promise<Object>} - Resultado do processamento
     */
    static async processEvent(eventData) {
        try {
            console.log(`Processando evento ${eventData.event}`);
            
            // Verificar se o evento possui um handler registrado
            if (EVENT_HANDLERS[eventData.event]) {
                // Executar o handler específico
                return await EVENT_HANDLERS[eventData.event](eventData);
            }
            
            // Se não houver handler específico, reportar que o evento foi recebido mas não processado
            console.log(`Evento ${eventData.event} não possui handler específico`);
            return {
                success: true,
                event: eventData.event,
                message: `Evento ${eventData.event} recebido, mas não possui um handler específico registrado`
            };
        } catch (error) {
            console.error(`Erro ao processar evento ${eventData.event}:`, error);
            return formatError(error);
        }
    }
    
    /**
     * Registra um novo handler para um evento
     * @param {string} eventName - Nome do evento
     * @param {Function} handler - Função de manipulação do evento
     */
    static registerHandler(eventName, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler deve ser uma função');
        }
        
        EVENT_HANDLERS[eventName] = handler;
        console.log(`Handler registrado para evento ${eventName}`);
    }
    
    /**
     * Verifica se um evento possui handler registrado
     * @param {string} eventName - Nome do evento a verificar
     * @returns {boolean} - Verdadeiro se o evento possuir um handler
     */
    static hasHandler(eventName) {
        return !!EVENT_HANDLERS[eventName];
    }
    
    /**
     * Retorna a lista de eventos suportados
     * @returns {string[]} - Array com nomes dos eventos suportados
     */
    static getSupportedEvents() {
        return Object.keys(EVENT_HANDLERS);
    }
}

module.exports = EventHandlerFactory;