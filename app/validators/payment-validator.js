const BaseValidator = require('./base-validator');

class PaymentValidator extends BaseValidator {
    static validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData) {
            this.throwError("Dados do pagamento são obrigatórios", 400);
        }

        // Validar campos obrigatórios
        const requiredFields = ['payable_type', 'payable_id', 'value', 'due_date'];
        errors.push(...this.validateRequiredFields(paymentData, requiredFields, 'pagamento'));
        
        // Validações específicas
        if (paymentData.payable_type && !['seller_subscription'].includes(paymentData.payable_type)) {
            errors.push("O campo 'payable_type' deve ser 'seller_subscription'.");
        }

        if (paymentData.value && isNaN(parseFloat(paymentData.value))) {
            errors.push("O campo 'value' deve ser um número válido.");
        }

        if (paymentData.due_date && !this.isValidDate(paymentData.due_date)) {
            errors.push("O campo 'due_date' deve ser uma data válida.");
        }

        // Validações opcionais para campos que, quando fornecidos, devem ser válidos
        if (paymentData.status && 
            !['pending', 'confirmed', 'overdue', 'refunded', 'canceled', 'failed'].includes(paymentData.status)) {
            errors.push("O campo 'status' deve ser um dos valores válidos: pendente, confirmado, atrasado, reembolsado, cancelado, falha.");
        }

        if (paymentData.net_value && isNaN(parseFloat(paymentData.net_value))) {
            errors.push("O campo 'net_value' deve ser um número válido.");
        }

        if (paymentData.payment_date && !this.isValidDate(paymentData.payment_date)) {
            errors.push("O campo 'payment_date' deve ser uma data válida.");
        }

        return this.throwValidationErrors(errors);
    }

    static validatePaymentUpdateData(paymentData) {
        const errors = [];

        if (!paymentData || Object.keys(paymentData).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização do pagamento", 400);
        }

        // Para atualizações, validamos apenas os campos que foram fornecidos
        if (paymentData.payable_type !== undefined) {
            if (!['seller_subscription'].includes(paymentData.payable_type)) {
                errors.push("O campo 'payable_type' deve ser 'seller_subscription'.");
            }
        }

        if (paymentData.value !== undefined) {
            if (paymentData.value === null) {
                errors.push("O campo 'value' não pode ser nulo.");
            } else if (isNaN(parseFloat(paymentData.value))) {
                errors.push("O campo 'value' deve ser um número válido.");
            }
        }

        if (paymentData.due_date !== undefined) {
            if (paymentData.due_date === null) {
                errors.push("O campo 'due_date' não pode ser nulo.");
            } else if (!this.isValidDate(paymentData.due_date)) {
                errors.push("O campo 'due_date' deve ser uma data válida.");
            }
        }

        if (paymentData.status !== undefined) {
            if (!['pending', 'confirmed', 'overdue', 'refunded', 'canceled', 'failed'].includes(paymentData.status)) {
                errors.push("O campo 'status' deve ser um dos valores válidos: pendente, confirmado, atrasado, reembolsado, cancelado, falha.");
            }
        }

        if (paymentData.net_value !== undefined && paymentData.net_value !== null && isNaN(parseFloat(paymentData.net_value))) {
            errors.push("O campo 'net_value' deve ser um número válido.");
        }

        if (paymentData.payment_date !== undefined && paymentData.payment_date !== null && !this.isValidDate(paymentData.payment_date)) {
            errors.push("O campo 'payment_date' deve ser uma data válida.");
        }

        return this.throwValidationErrors(errors);
    }

    // Método específico para validar pagamentos de pedidos
    // Removido: não criamos pagamentos diretos de Order; apenas de subscriptions

    // Método específico para validar pagamentos de assinaturas de vendedores
    static validateSubscriptionPaymentData(paymentData) {
        // Garantir que o pagamento está vinculado a uma assinatura
    if (!paymentData || paymentData.payable_type !== 'seller_subscription') {
            this.throwError("O tipo de pagamento deve ser 'seller_subscription' para pagamentos de assinaturas.", 400);
        }

        // Validar os outros campos com o método genérico
        return this.validatePaymentData(paymentData);
    }
}

module.exports = PaymentValidator;
