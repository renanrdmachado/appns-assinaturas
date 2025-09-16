const BaseValidator = require('./base-validator');

class AsaasValidator extends BaseValidator {
    /**
     * Valida dados do cliente Asaas
     * @param {Object} customerData - Dados do cliente
     */
    static validateCustomerData(customerData) {
        const errors = [];

        if (!customerData) {
            this.throwError("Dados do cliente são obrigatórios", 400);
        }

        // Campos obrigatórios
        const requiredFields = ['name', 'cpfCnpj'];
        errors.push(...this.validateRequiredFields(customerData, requiredFields, 'cliente'));

        // Validações específicas
        if (customerData.cpfCnpj && !this.isValidCpfCnpj(customerData.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
        }

        // Validar campos opcionais quando fornecidos
        if (customerData.email && !this.isValidEmail(customerData.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }

        if (customerData.mobilePhone && !this.isValidPhone(customerData.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido");
        }

        if (customerData.postalCode && !this.isValidPostalCode(customerData.postalCode)) {
            errors.push("O campo 'postalCode' deve ser um CEP válido");
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida dados para subconta do Asaas
     * @param {Object} accountData - Dados da subconta
     */
    static validateSubAccountData(accountData) {
        const errors = [];

        if (!accountData) {
            this.throwError("Dados da subconta são obrigatórios", 400);
        }

        const requiredFields = ['name', 'email', 'cpfCnpj', 'mobilePhone', 'incomeValue'];
        errors.push(...this.validateRequiredFields(accountData, requiredFields, 'subconta'));

        // Validações específicas
        if (accountData.cpfCnpj && !this.isValidCpfCnpj(accountData.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
        }

        // Validar que birthDate é obrigatório para pessoas físicas (CPF)
        if (accountData.cpfCnpj && accountData.cpfCnpj.length <= 11 && !accountData.birthDate) {
            errors.push("O campo 'birthDate' é obrigatório para CPF (pessoa física)");
        }

        if (accountData.email && !this.isValidEmail(accountData.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }

        if (accountData.loginEmail && !this.isValidEmail(accountData.loginEmail)) {
            errors.push("O campo 'loginEmail' deve ser um email válido");
        }

        if (accountData.mobilePhone && !this.isValidPhone(accountData.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido");
        }

        // Validação específica para incomeValue
        if (accountData.incomeValue) {
            if (isNaN(Number(accountData.incomeValue)) || Number(accountData.incomeValue) <= 0) {
                errors.push("O campo 'incomeValue' deve ser um valor numérico positivo");
            }
        }

        return this.throwValidationErrors(errors);
    }
}

module.exports = AsaasValidator;
