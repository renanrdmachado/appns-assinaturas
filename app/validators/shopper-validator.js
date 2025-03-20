class ShopperValidator {
    /**
     * Valida o ID do comprador
     * @param {number|string} id - ID a ser validado
     */
    static validateId(id) {
        if (!id) {
            const error = new Error("ID é obrigatório");
            error.statusCode = 400;
            throw error;
        }
        
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            const error = new Error("ID do comprador deve ser um número positivo");
            error.statusCode = 400;
            throw error;
        }
        
        return true;
    }
    
    /**
     * Valida o ID da Nuvemshop
     * @param {string} nuvemshopId - ID da Nuvemshop a ser validado
     */
    static validateNuvemshopId(nuvemshopId) {
        if (!nuvemshopId) {
            const error = new Error("ID da Nuvemshop é obrigatório");
            error.statusCode = 400;
            throw error;
        }
        
        return true;
    }
    
    /**
     * Valida os dados do comprador para criação
     * @param {Object} data - Dados do comprador
     */
    static validateShopperData(data) {
        const errors = [];

        if (!data) {
            const error = new Error("Dados do comprador são obrigatórios");
            error.statusCode = 400;
            throw error;
        }
        
        // Validar campos obrigatórios
        if (!data.nuvemshop_id) {
            errors.push("O campo 'nuvemshop_id' é obrigatório.");
        }

        if (!data.name) {
            errors.push("O campo 'name' é obrigatório.");
        }

        if (!data.email) {
            errors.push("O campo 'email' é obrigatório.");
        } else if (!this.isValidEmail(data.email)) {
            errors.push("O campo 'email' deve ser um email válido.");
        }

        if (!data.cpfCnpj) {
            errors.push("O campo 'cpfCnpj' é obrigatório.");
        } else if (!this.isValidCpfCnpj(data.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido.");
        }

        // Validar campos opcionais quando fornecidos
        if (data.mobilePhone && !this.isValidPhone(data.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido.");
        }

        if (data.birthDate) {
            const dateObj = new Date(data.birthDate);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'birthDate' deve ser uma data válida.");
            }
        }

        if (data.postalCode && !this.isValidPostalCode(data.postalCode)) {
            errors.push("O campo 'postalCode' deve ser um CEP válido.");
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
    
    /**
     * Valida os dados do comprador para atualização
     * @param {Object} data - Dados do comprador
     */
    static validateShopperUpdateData(data) {
        const errors = [];

        if (!data || Object.keys(data).length === 0) {
            const error = new Error("Nenhum dado fornecido para atualização");
            error.statusCode = 400;
            throw error;
        }
        
        // Nuvemshop ID não deve ser alterado
        if (data.nuvemshop_id !== undefined) {
            errors.push("Não é permitido alterar o ID da Nuvemshop.");
        }

        // Validar campos opcionais quando fornecidos
        if (data.email !== undefined && !this.isValidEmail(data.email)) {
            errors.push("O campo 'email' deve ser um email válido.");
        }

        if (data.cpfCnpj !== undefined && !this.isValidCpfCnpj(data.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido.");
        }

        if (data.mobilePhone !== undefined && !this.isValidPhone(data.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido.");
        }

        if (data.birthDate !== undefined) {
            const dateObj = new Date(data.birthDate);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'birthDate' deve ser uma data válida.");
            }
        }

        if (data.postalCode !== undefined && !this.isValidPostalCode(data.postalCode)) {
            errors.push("O campo 'postalCode' deve ser um CEP válido.");
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

module.exports = ShopperValidator;
