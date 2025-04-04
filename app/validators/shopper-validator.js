const BaseValidator = require('./base-validator');

class ShopperValidator extends BaseValidator {
    /**
     * Valida o ID do comprador
     * @param {number|string} id - ID a ser validado
     */
    static validateId(id) {
        // Implementação correta sem chamada recursiva
        if (!id) {
            this.throwError('ID do comprador é obrigatório', 400);
        }
        
        if (typeof id !== 'string' && typeof id !== 'number') {
            this.throwError('ID do comprador deve ser uma string ou número', 400);
        }
        
        if (typeof id === 'string' && id.trim() === '') {
            this.throwError('ID do comprador não pode ser vazio', 400);
        }
        
        return true;
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
     * Valida os dados do comprador para criação
     * @param {Object} data - Dados do comprador
     */
    static validateShopperData(data) {
        const errors = [];

        if (!data) {
            this.throwError("Dados do comprador são obrigatórios", 400);
        }
        
        // Validar campos obrigatórios
        const requiredFields = ['nuvemshop_id', 'name', 'email', 'cpfCnpj'];
        errors.push(...this.validateRequiredFields(data, requiredFields, 'comprador'));
        
        // Validações específicas
        if (data.email && !this.isValidEmail(data.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }

        if (data.cpfCnpj && !this.isValidCpfCnpj(data.cpfCnpj)) {
            errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
        }

        return this.throwValidationErrors(errors);
    }
    
    /**
     * Valida os dados do comprador para atualização
     * @param {Object} data - Dados do comprador
     */
    static validateShopperUpdateData(data) {
        const errors = [];

        if (!data || Object.keys(data).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização", 400);
        }
        
        // Nuvemshop ID não deve ser alterado
        if (data.nuvemshop_id !== undefined) {
            errors.push("Não é permitido alterar o ID da Nuvemshop");
        }

        // Validar CPF/CNPJ apenas se estiver presente
        if (data.cpfCnpj !== undefined) {
            if (!data.cpfCnpj) {
                errors.push("O campo 'cpfCnpj' não pode ser vazio");
            } else if (!this.isValidCpfCnpj(data.cpfCnpj)) {
                errors.push("O campo 'cpfCnpj' deve ser um CPF ou CNPJ válido");
            }
        }

        // Validar email apenas se estiver presente
        if (data.email !== undefined && !this.isValidEmail(data.email)) {
            errors.push("O campo 'email' deve ser um email válido");
        }

        return this.throwValidationErrors(errors);
    }
}

module.exports = ShopperValidator;
