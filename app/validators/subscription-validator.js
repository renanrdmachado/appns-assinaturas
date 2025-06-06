const BaseValidator = require('./base-validator');
const AsaasFormatter = require('../utils/asaas-formatter');

class SubscriptionValidator extends BaseValidator {
    /**
     * Valida os dados da assinatura para o Asaas
     * @param {Object} data - Dados da assinatura para o Asaas
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
            if (!AsaasFormatter.isValidCycle(data.cycle)) {
                errors.push(`O campo 'cycle' deve ser um dos seguintes valores: WEEKLY, BIWEEKLY, MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY`);
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
     * Valida os dados da assinatura para atualização no Asaas
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
            if (!AsaasFormatter.isValidCycle(data.cycle)) {
                errors.push(`O campo 'cycle' deve ser um dos seguintes valores: WEEKLY, BIWEEKLY, MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY`);
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
    
    /**
     * Valida dados para criação de assinatura local (antes de enviar ao Asaas)
     * @param {Object} data - Dados da assinatura local
     */
    static validateCreateData(data) {
        const errors = [];

        if (!data) {
            this.throwError("Dados da assinatura são obrigatórios", 400);
        }
        
        // Validar campos obrigatórios
        const requiredFields = ['value'];
        errors.push(...this.validateRequiredFields(data, requiredFields, 'assinatura'));
        
        // Validar valor
        if (data.value !== undefined && (isNaN(data.value) || parseFloat(data.value) <= 0)) {
            errors.push("O campo 'value' deve ser um valor numérico positivo");
        }
        
        // Validar next_due_date
        if (data.next_due_date) {
            try {
                const dueDate = new Date(data.next_due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (isNaN(dueDate.getTime())) {
                    errors.push("O campo 'next_due_date' deve ser uma data válida");
                } else if (dueDate < today) {
                    errors.push("O campo 'next_due_date' não pode ser anterior à data atual");
                }
            } catch (e) {
                errors.push("O campo 'next_due_date' deve ser uma data válida");
            }
        }
        
        // Validar ciclo
        if (data.cycle) {
            const normalizedCycle = AsaasFormatter.normalizeCycle(data.cycle);
            if (!AsaasFormatter.isValidCycle(normalizedCycle)) {
                errors.push(`O campo 'cycle' é inválido. Use um dos seguintes: WEEKLY, BIWEEKLY, MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY`);
            }
        }
        
        // Validar end_date
        if (data.end_date) {
            try {
                const endDate = new Date(data.end_date);
                if (isNaN(endDate.getTime())) {
                    errors.push("O campo 'end_date' deve ser uma data válida");
                }
            } catch (e) {
                errors.push("O campo 'end_date' deve ser uma data válida");
            }
        }

        return this.throwValidationErrors(errors);
    }
    
    /**
     * Valida dados para atualização de assinatura local
     * @param {Object} data - Dados de atualização da assinatura local
     */
    static validateUpdateData(data) {
        const errors = [];

        if (!data || Object.keys(data).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização", 400);
        }
        
        // Verificar se o valor é válido, se fornecido
        if (data.value !== undefined && (isNaN(data.value) || parseFloat(data.value) <= 0)) {
            errors.push("O campo 'value' deve ser um valor numérico positivo");
        }
        
        // Verificar se a data de vencimento é válida, se fornecida
        if (data.next_due_date) {
            try {
                const dueDate = new Date(data.next_due_date);
                if (isNaN(dueDate.getTime())) {
                    errors.push("O campo 'next_due_date' deve ser uma data válida");
                }
            } catch (e) {
                errors.push("O campo 'next_due_date' deve ser uma data válida");
            }
        }
        
        // Verificar se a data de término é válida, se fornecida
        if (data.end_date) {
            try {
                const endDate = new Date(data.end_date);
                if (isNaN(endDate.getTime())) {
                    errors.push("O campo 'end_date' deve ser uma data válida");
                }
            } catch (e) {
                errors.push("O campo 'end_date' deve ser uma data válida");
            }
        }
        
        // Verificar se o ciclo é válido, se fornecido
        if (data.cycle) {
            const normalizedCycle = AsaasFormatter.normalizeCycle(data.cycle);
            if (!AsaasFormatter.isValidCycle(normalizedCycle)) {
                errors.push(`O campo 'cycle' é inválido. Use um dos seguintes: WEEKLY, BIWEEKLY, MONTHLY, BIMONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY`);
            }
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida dados para atualização de status de assinatura
     * @param {Object} data - Objeto contendo o status para validação
     */
    static validateStatusUpdate(data) {
        const errors = [];

        if (!data || !data.status) {
            this.throwError("Status é obrigatório para atualização", 400);
        }

        const validStatuses = ['active', 'inactive', 'overdue', 'canceled', 'pending'];
        if (!validStatuses.includes(data.status)) {
            errors.push(`Status inválido. Use um dos seguintes: ${validStatuses.join(', ')}`);
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida método de pagamento para assinatura
     * @param {Object} data - Objeto contendo o payment_method para validação
     */
    static validatePaymentMethodUpdate(data) {
        const errors = [];

        if (!data || !data.payment_method) {
            this.throwError("Método de pagamento é obrigatório", 400);
        }

        const validMethods = ['credit_card', 'pix', 'boleto'];
        if (!validMethods.includes(data.payment_method)) {
            errors.push(`Método de pagamento inválido. Use um dos seguintes: ${validMethods.join(', ')}`);
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida atualização de preço de assinatura
     * @param {Object} data - Objeto contendo o valor para validação
     */
    static validatePriceUpdate(data) {
        const errors = [];

        if (!data || data.value === undefined) {
            this.throwError("Valor é obrigatório para atualização de preço", 400);
        }

        if (isNaN(data.value) || parseFloat(data.value) <= 0) {
            errors.push("O valor deve ser um número positivo");
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida se a assinatura pode ser editada baseada em seu status atual
     * @param {Object} subscription - Objeto da assinatura
     * @param {string} updateType - Tipo de atualização ('status', 'payment_method', 'price', 'full')
     */
    static validateSubscriptionCanBeEdited(subscription, updateType = 'full') {
        const errors = [];

        if (!subscription) {
            this.throwError("Assinatura não encontrada", 404);
        }

        // Verificar se a assinatura está em um estado que permite edição
        const editableStatuses = ['active', 'pending', 'overdue'];
        
        if (updateType === 'status') {
            // Para atualização de status, permitir qualquer status atual exceto 'canceled'
            if (subscription.status === 'canceled') {
                errors.push("Não é possível alterar o status de uma assinatura cancelada");
            }
        } else {
            // Para outras atualizações, verificar se o status permite edição
            if (!editableStatuses.includes(subscription.status)) {
                errors.push(`Não é possível editar uma assinatura com status '${subscription.status}'. Status permitidos: ${editableStatuses.join(', ')}`);
            }
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Sanitiza dados de entrada para atualização
     * @param {Object} data - Dados a serem sanitizados
     * @returns {Object} Dados sanitizados
     */
    static sanitizeUpdateData(data) {
        const sanitized = {};

        // Sanitizar valor
        if (data.value !== undefined) {
            sanitized.value = parseFloat(data.value);
        }

        // Sanitizar datas
        if (data.next_due_date) {
            sanitized.next_due_date = new Date(data.next_due_date);
        }

        if (data.end_date) {
            sanitized.end_date = new Date(data.end_date);
        }

        // Sanitizar ciclo
        if (data.cycle) {
            sanitized.cycle = AsaasFormatter.normalizeCycle(data.cycle);
        }

        // Sanitizar status
        if (data.status) {
            sanitized.status = data.status.toLowerCase();
        }

        // Sanitizar método de pagamento
        if (data.payment_method) {
            sanitized.payment_method = data.payment_method.toLowerCase();
        }

        // Outros campos que não precisam de sanitização especial
        ['plan_name', 'billing_type'].forEach(field => {
            if (data[field] !== undefined) {
                sanitized[field] = data[field];
            }
        });

        return sanitized;
    }
}

module.exports = SubscriptionValidator;
