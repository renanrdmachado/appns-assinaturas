const BaseValidator = require('./base-validator');

class SubscriptionValidator extends BaseValidator {
    /**
     * Valida os dados da assinatura
     * @param {Object} data - Dados da assinatura
     */
    static validateSubscriptionData(data) {
        const errors = [];

        if (!data) {
            this.throwError("Dados da assinatura são obrigatórios", 400);
        }
        
        // Validar campos obrigatórios
        const requiredFields = ['customer', 'billingType', 'value', 'nextDueDate', 'cycle'];
        errors.push(...this.validateRequiredFields(data, requiredFields, 'assinatura'));
        
        // Verificar se o valor é válido
        if (data.value !== undefined && (isNaN(data.value) || data.value <= 0)) {
            errors.push("O campo 'value' deve ser um valor numérico positivo");
        }
        
        // Verificar se a data de vencimento é válida
        if (data.nextDueDate && !this.isValidDate(data.nextDueDate)) {
            errors.push("O campo 'nextDueDate' deve ser uma data válida");
        }
        
        // Verificar se a data de término é válida, se fornecida
        if (data.endDate && !this.isValidDate(data.endDate)) {
            errors.push("O campo 'endDate' deve ser uma data válida");
        }
        
        // Verificar se o ciclo é válido
        if (data.cycle) {
            const validCycles = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'];
            if (!validCycles.includes(data.cycle)) {
                errors.push(`O campo 'cycle' deve ser um dos seguintes valores: ${validCycles.join(', ')}`);
            }
        }
        
        // Verificar se o número máximo de pagamentos é válido, se fornecido
        if (data.maxPayments !== undefined && (isNaN(data.maxPayments) || data.maxPayments <= 0)) {
            errors.push("O campo 'maxPayments' deve ser um número inteiro positivo");
        }
        
        // Verificar se a descrição não excede o limite
        if (data.description && data.description.length > 500) {
            errors.push("O campo 'description' deve ter no máximo 500 caracteres");
        }

        return this.throwValidationErrors(errors);
    }
    
    /**
     * Valida os dados da assinatura para atualização
     * @param {Object} data - Dados da assinatura para atualização
     */
    static validateSubscriptionUpdateData(data) {
        const errors = [];

        if (!data || Object.keys(data).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização", 400);
        }
        
        // Verificar campos que não devem ser alterados
        const immutableFields = ['customer'];
        for (const field of immutableFields) {
            if (data[field] !== undefined) {
                errors.push(`O campo '${field}' não pode ser alterado`);
            }
        }
        
        // Verificar se o valor é válido, se fornecido
        if (data.value !== undefined && (isNaN(data.value) || data.value <= 0)) {
            errors.push("O campo 'value' deve ser um valor numérico positivo");
        }
        
        // Verificar se a data de vencimento é válida, se fornecida
        if (data.nextDueDate && !this.isValidDate(data.nextDueDate)) {
            errors.push("O campo 'nextDueDate' deve ser uma data válida");
        }
        
        // Verificar se a data de término é válida, se fornecida
        if (data.endDate && !this.isValidDate(data.endDate)) {
            errors.push("O campo 'endDate' deve ser uma data válida");
        }
        
        // Verificar se o ciclo é válido, se fornecido
        if (data.cycle) {
            const validCycles = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'];
            if (!validCycles.includes(data.cycle)) {
                errors.push(`O campo 'cycle' deve ser um dos seguintes valores: ${validCycles.join(', ')}`);
            }
        }
        
        // Verificar se o número máximo de pagamentos é válido, se fornecido
        if (data.maxPayments !== undefined && (isNaN(data.maxPayments) || data.maxPayments <= 0)) {
            errors.push("O campo 'maxPayments' deve ser um número inteiro positivo");
        }
        
        // Verificar se a descrição não excede o limite, se fornecida
        if (data.description && data.description.length > 500) {
            errors.push("O campo 'description' deve ter no máximo 500 caracteres");
        }

        return this.throwValidationErrors(errors);
    }
}

module.exports = SubscriptionValidator;
