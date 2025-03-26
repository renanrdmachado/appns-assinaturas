const BaseValidator = require('./base-validator');

class SellerValidator extends BaseValidator {
    /**
     * Valida o ID do vendedor
     * @param {number|string} id - ID a ser validado
     */
    static validateId(id) {
        return super.validateId(id, 'vendedor');
    }
    
    /**
     * Valida o ID da Nuvemshop
     * @param {string} nuvemshopId - ID da Nuvemshop a ser validado
     */
    static validateNuvemshopId(nuvemshopId) {
        if (!nuvemshopId) {
            this.throwError("ID da Nuvemshop é obrigatório", 400);
        }
        
        return true;
    }
    
    /**
     * Valida os dados do vendedor para criação
     * @param {Object} data - Dados do vendedor
     */
    static validateSellerData(data) {
        const errors = [];

        if (!data) {
            this.throwError("Dados do vendedor são obrigatórios", 400);
        }
        
        // Validar campos obrigatórios
        const requiredFields = ['nuvemshop_id', 'Asaas_cpfCnpj'];
        errors.push(...this.validateRequiredFields(data, requiredFields, 'vendedor'));
        
        // Validações específicas
        if (data.Asaas_cpfCnpj && !this.isValidCpfCnpj(data.Asaas_cpfCnpj)) {
            errors.push("O campo 'Asaas_cpfCnpj' deve ser um CPF ou CNPJ válido");
        }
        
        // Validar campos opcionais quando fornecidos
        if (data.Asaas_loginEmail && !this.isValidEmail(data.Asaas_loginEmail)) {
            errors.push("O campo 'Asaas_loginEmail' deve ser um email válido");
        }
        
        if (data.Asaas_mobilePhone && !this.isValidPhone(data.Asaas_mobilePhone)) {
            errors.push("O campo 'Asaas_mobilePhone' deve ser um telefone válido");
        }
        
        if (data.Asaas_postalCode && !this.isValidPostalCode(data.Asaas_postalCode)) {
            errors.push("O campo 'Asaas_postalCode' deve ser um CEP válido");
        }
        
        if (data.Asaas_birthDate && !this.isValidDate(data.Asaas_birthDate)) {
            errors.push("O campo 'Asaas_birthDate' deve ser uma data válida");
        }

        return this.throwValidationErrors(errors);
    }
    
    /**
     * Valida os dados do vendedor para atualização
     * @param {Object} data - Dados do vendedor
     */
    static validateSellerUpdateData(data) {
        const errors = [];

        if (!data || Object.keys(data).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização", 400);
        }
        
        // Nuvemshop ID não deve ser alterado
        if (data.nuvemshop_id !== undefined) {
            errors.push("Não é permitido alterar o ID da Nuvemshop");
        }

        // CPF/CNPJ não deve ser vazio se estiver sendo atualizado
        if (data.Asaas_cpfCnpj !== undefined) {
            if (!data.Asaas_cpfCnpj) {
                errors.push("O campo 'Asaas_cpfCnpj' não pode ser vazio");
            } else if (!this.isValidCpfCnpj(data.Asaas_cpfCnpj)) {
                errors.push("O campo 'Asaas_cpfCnpj' deve ser um CPF ou CNPJ válido");
            }
        }
        
        // Validar outros campos quando fornecidos
        if (data.Asaas_loginEmail !== undefined && !this.isValidEmail(data.Asaas_loginEmail)) {
            errors.push("O campo 'Asaas_loginEmail' deve ser um email válido");
        }
        
        if (data.Asaas_mobilePhone !== undefined && !this.isValidPhone(data.Asaas_mobilePhone)) {
            errors.push("O campo 'Asaas_mobilePhone' deve ser um telefone válido");
        }
        
        if (data.Asaas_postalCode !== undefined && !this.isValidPostalCode(data.Asaas_postalCode)) {
            errors.push("O campo 'Asaas_postalCode' deve ser um CEP válido");
        }
        
        if (data.Asaas_birthDate !== undefined && !this.isValidDate(data.Asaas_birthDate)) {
            errors.push("O campo 'Asaas_birthDate' deve ser uma data válida");
        }

        return this.throwValidationErrors(errors);
    }
    
    /**
     * Valida dados da subconta
     * @param {Object} data - Dados da subconta
     */
    static validateSubAccountData(data) {
        const errors = [];

        if (!data) {
            this.throwError("Dados da subconta são obrigatórios", 400);
        }
        
        // Validar campos obrigatórios para subconta
        const requiredFields = ['cpfCnpj', 'name', 'email', 'mobilePhone', 'address', 
                              'addressNumber', 'province', 'postalCode'];
        errors.push(...this.validateRequiredFields(data, requiredFields, 'subconta'));
        
        // Validações específicas
        if (data.cpfCnpj && !this.isValidCpfCnpj(data.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
        }
        
        if (data.email && !this.isValidEmail(data.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }
        
        if (data.mobilePhone && !this.isValidPhone(data.mobilePhone)) {
            errors.push("O campo 'mobilePhone' deve ser um telefone válido");
        }
        
        if (data.postalCode && !this.isValidPostalCode(data.postalCode)) {
            errors.push("O campo 'postalCode' deve ser um CEP válido");
        }

        return this.throwValidationErrors(errors);
    }
}

module.exports = SellerValidator;
