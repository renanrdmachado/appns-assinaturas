class AsaasValidator {
    /**
     * Valida dados do cliente Asaas
     * @param {Object} customerData - Dados do cliente
     */
    static validateCustomerData(customerData) {
        const errors = [];

        if (!customerData) {
            const error = new Error("Dados do cliente são obrigatórios");
            error.statusCode = 400;
            throw error;
        }

        // Campos obrigatórios
        if (!customerData.name) {
            errors.push("O campo 'name' é obrigatório");
        }

        if (!customerData.cpfCnpj) {
            errors.push("O campo 'cpfCnpj' é obrigatório");
        } else if (!this.isValidCpfCnpj(customerData.cpfCnpj)) {
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

        // Lançar erro com todas as validações que falharam
        if (errors.length > 0) {
            const error = new Error(errors.join(". "));
            error.statusCode = 400;
            error.validationErrors = errors;
            throw error;
        }

        return true;
    }

    /**
     * Valida dados para subconta do Asaas
     * @param {Object} accountData - Dados da subconta
     */
    static validateSubAccountData(accountData) {
        const errors = [];

        if (!accountData) {
            const error = new Error("Dados da subconta são obrigatórios");
            error.statusCode = 400;
            throw error;
        }

        // Campos obrigatórios para subcontas
        if (!accountData.name) {
            errors.push("O campo 'name' é obrigatório");
        }

        if (!accountData.email) {
            errors.push("O campo 'email' é obrigatório");
        } else if (!this.isValidEmail(accountData.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }

        if (!accountData.cpfCnpj) {
            errors.push("O campo 'cpfCnpj' é obrigatório");
        } else if (!this.isValidCpfCnpj(accountData.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
        }

        // Campos específicos de subconta
        if (!accountData.loginEmail) {
            errors.push("O campo 'loginEmail' é obrigatório");
        } else if (!this.isValidEmail(accountData.loginEmail)) {
            errors.push("O campo 'loginEmail' deve ser um email válido");
        }

        if (!accountData.mobilePhone) {
            errors.push("O campo 'mobilePhone' é obrigatório");
        } else if (!this.isValidPhone(accountData.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido");
        }

        // Lançar erro com todas as validações que falharam
        if (errors.length > 0) {
            const error = new Error(errors.join(". "));
            error.statusCode = 400;
            error.validationErrors = errors;
            throw error;
        }

        return true;
    }

    // Métodos auxiliares para validação
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidCpfCnpj(cpfCnpj) {
        // Remove caracteres não numéricos
        const numbers = cpfCnpj.replace(/\D/g, '');
        
        // Verifica se é CPF (11 dígitos) ou CNPJ (14 dígitos)
        return numbers.length === 11 || numbers.length === 14;
    }

    static isValidPhone(phone) {
        // Remove caracteres não numéricos
        const numbers = phone.replace(/\D/g, '');
        
        // Verifica se tem entre 10 e 11 dígitos (com ou sem DDD)
        return numbers.length >= 10 && numbers.length <= 11;
    }

    static isValidPostalCode(postalCode) {
        // Remove caracteres não numéricos
        const numbers = postalCode.replace(/\D/g, '');
        
        // CEP brasileiro tem 8 dígitos
        return numbers.length === 8;
    }
}

module.exports = AsaasValidator;
