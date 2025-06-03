/**
 * Validador para métodos de pagamento do seller
 */

const VALID_PAYMENT_METHODS = ['credit_card', 'pix', 'boleto'];

class PaymentMethodsValidator {
    /**
     * Valida os métodos de pagamento enviados
     * @param {Array} paymentMethods - Array com os métodos de pagamento
     */
    static validatePaymentMethods(paymentMethods) {
        if (!paymentMethods) {
            throw new Error('Métodos de pagamento são obrigatórios');
        }

        if (!Array.isArray(paymentMethods)) {
            throw new Error('Métodos de pagamento devem ser um array');
        }

        if (paymentMethods.length === 0) {
            throw new Error('Pelo menos um método de pagamento deve ser informado');
        }

        // Verificar se todos os métodos são válidos
        const invalidMethods = paymentMethods.filter(method => !VALID_PAYMENT_METHODS.includes(method));
        if (invalidMethods.length > 0) {
            throw new Error(`Métodos de pagamento inválidos: ${invalidMethods.join(', ')}. Métodos válidos: ${VALID_PAYMENT_METHODS.join(', ')}`);
        }

        // Verificar duplicatas
        const uniqueMethods = [...new Set(paymentMethods)];
        if (uniqueMethods.length !== paymentMethods.length) {
            throw new Error('Métodos de pagamento não podem ser duplicados');
        }

        return true;
    }

    /**
     * Valida um único método de pagamento
     * @param {string} paymentMethod - Método de pagamento
     */
    static validateSinglePaymentMethod(paymentMethod) {
        if (!paymentMethod) {
            throw new Error('Método de pagamento é obrigatório');
        }

        if (typeof paymentMethod !== 'string') {
            throw new Error('Método de pagamento deve ser uma string');
        }

        if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
            throw new Error(`Método de pagamento inválido: ${paymentMethod}. Métodos válidos: ${VALID_PAYMENT_METHODS.join(', ')}`);
        }

        return true;
    }

    /**
     * Retorna os métodos de pagamento válidos
     */
    static getValidPaymentMethods() {
        return [...VALID_PAYMENT_METHODS];
    }
}

module.exports = PaymentMethodsValidator;
