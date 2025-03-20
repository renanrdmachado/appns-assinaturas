class PaymentValidator {
    static validatePaymentData(paymentData) {
        const errors = [];

        // Validar campos obrigatórios
        if (!paymentData.payable_type) {
            errors.push("O campo 'payable_type' é obrigatório.");
        } else if (!['order', 'seller_subscription'].includes(paymentData.payable_type)) {
            errors.push("O campo 'payable_type' deve ser 'order' ou 'seller_subscription'.");
        }

        if (!paymentData.payable_id) {
            errors.push("O campo 'payable_id' é obrigatório.");
        }

        if (!paymentData.value) {
            errors.push("O campo 'value' é obrigatório.");
        } else if (isNaN(parseFloat(paymentData.value))) {
            errors.push("O campo 'value' deve ser um número válido.");
        }

        if (!paymentData.due_date) {
            errors.push("O campo 'due_date' é obrigatório.");
        } else {
            const dateObj = new Date(paymentData.due_date);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'due_date' deve ser uma data válida.");
            }
        }

        // Validações opcionais para campos que, quando fornecidos, devem ser válidos
        if (paymentData.status && 
            !['pending', 'confirmed', 'overdue', 'refunded', 'canceled', 'failed'].includes(paymentData.status)) {
            errors.push("O campo 'status' deve ser um dos valores válidos: pending, confirmed, overdue, refunded, canceled, failed.");
        }

        if (paymentData.net_value && isNaN(parseFloat(paymentData.net_value))) {
            errors.push("O campo 'net_value' deve ser um número válido.");
        }

        if (paymentData.payment_date) {
            const dateObj = new Date(paymentData.payment_date);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'payment_date' deve ser uma data válida.");
            }
        }

        // Lançar erro com todas as validações que falharam
        if (errors.length > 0) {
            const error = new Error(errors.join(" "));
            error.statusCode = 400;
            error.validationErrors = errors;
            throw error;
        }

        return true;
    }

    static validatePaymentUpdateData(paymentData) {
        const errors = [];

        // Para atualizações, validamos apenas os campos que foram fornecidos
        if (paymentData.payable_type !== undefined) {
            if (!['order', 'seller_subscription'].includes(paymentData.payable_type)) {
                errors.push("O campo 'payable_type' deve ser 'order' ou 'seller_subscription'.");
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
            } else {
                const dateObj = new Date(paymentData.due_date);
                if (isNaN(dateObj.getTime())) {
                    errors.push("O campo 'due_date' deve ser uma data válida.");
                }
            }
        }

        if (paymentData.status !== undefined) {
            if (!['pending', 'confirmed', 'overdue', 'refunded', 'canceled', 'failed'].includes(paymentData.status)) {
                errors.push("O campo 'status' deve ser um dos valores válidos: pending, confirmed, overdue, refunded, canceled, failed.");
            }
        }

        if (paymentData.net_value !== undefined && paymentData.net_value !== null && isNaN(parseFloat(paymentData.net_value))) {
            errors.push("O campo 'net_value' deve ser um número válido.");
        }

        if (paymentData.payment_date !== undefined && paymentData.payment_date !== null) {
            const dateObj = new Date(paymentData.payment_date);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'payment_date' deve ser uma data válida.");
            }
        }

        // Lançar erro com todas as validações que falharam
        if (errors.length > 0) {
            const error = new Error(errors.join(" "));
            error.statusCode = 400;
            error.validationErrors = errors;
            throw error;
        }

        return true;
    }

    // Método específico para validar pagamentos de pedidos
    static validateOrderPaymentData(paymentData) {
        // Garantir que o pagamento está vinculado a um pedido
        if (paymentData.payable_type !== 'order') {
            const error = new Error("O tipo de pagamento deve ser 'order' para pagamentos de pedidos.");
            error.statusCode = 400;
            throw error;
        }

        // Validar os outros campos com o método genérico
        return this.validatePaymentData(paymentData);
    }

    // Método específico para validar pagamentos de assinaturas de vendedores
    static validateSubscriptionPaymentData(paymentData) {
        // Garantir que o pagamento está vinculado a uma assinatura
        if (paymentData.payable_type !== 'seller_subscription') {
            const error = new Error("O tipo de pagamento deve ser 'seller_subscription' para pagamentos de assinaturas.");
            error.statusCode = 400;
            throw error;
        }

        // Validar os outros campos com o método genérico
        return this.validatePaymentData(paymentData);
    }
}

module.exports = PaymentValidator;
