/**
 * Classe base para todos os validadores
 * Implementa métodos comuns de validação e tratamento de erros
 */
class BaseValidator {
    /**
     * Valida o ID genérico
     * @param {number|string} id - ID a ser validado
     * @param {string} entityName - Nome da entidade para mensagem de erro personalizada
     */
    static validateId(id, entityName = 'registro') {
        if (!id) {
            this.throwError(`ID é obrigatório`, 400);
        }
        
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            this.throwError(`ID do ${entityName} deve ser um número positivo`, 400);
        }
        
        return true;
    }
    
    /**
     * Método utilitário para lançar erros de validação
     * @param {Array|string} errors - Lista de erros ou mensagem de erro única
     * @param {number} statusCode - Código de status HTTP (default: 400)
     */
    static throwValidationErrors(errors, statusCode = 400) {
        if (Array.isArray(errors) && errors.length > 0) {
            const error = new Error(errors.join(". "));
            error.statusCode = statusCode;
            error.validationErrors = errors;
            throw error;
        }
        
        return true;
    }
    
    /**
     * Método para lançar um erro simples
     * @param {string} message - Mensagem de erro
     * @param {number} statusCode - Código de status HTTP (default: 400)
     */
    static throwError(message, statusCode = 400) {
        const error = new Error(message);
        error.statusCode = statusCode;
        throw error;
    }
    
    /**
     * Verifica se um objeto tem todas as propriedades obrigatórias
     * @param {Object} data - Objeto a ser validado
     * @param {Array} requiredFields - Lista de campos obrigatórios
     * @param {string} entityName - Nome da entidade para mensagem personalizada
     * @returns {Array} - Lista de erros encontrados
     */
    static validateRequiredFields(data, requiredFields, entityName = 'registro') {
        const errors = [];
        
        if (!data) {
            this.throwError(`Dados do ${entityName} são obrigatórios`, 400);
        }
        
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                errors.push(`O campo '${field}' é obrigatório`);
            }
        }
        
        return errors;
    }
    
    /**
     * Valida se um email é válido
     * @param {string} email - Email a ser validado
     * @returns {boolean} - true se o email for válido
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Valida se um CPF/CNPJ é válido (apenas formato)
     * @param {string} cpfCnpj - CPF/CNPJ a ser validado
     * @returns {boolean} - true se o CPF/CNPJ for válido
     */
    static isValidCpfCnpj(cpfCnpj) {
        // Remove caracteres não numéricos
        const numbers = cpfCnpj.replace(/\D/g, '');
        
        // Verifica se é CPF (11 dígitos) ou CNPJ (14 dígitos)
        return numbers.length === 11 || numbers.length === 14;
    }
    
    /**
     * Valida se um telefone é válido
     * @param {string} phone - Telefone a ser validado
     * @returns {boolean} - true se o telefone for válido
     */
    static isValidPhone(phone) {
        // Remove caracteres não numéricos
        const numbers = phone.replace(/\D/g, '');
        
        // Verifica se tem entre 10 e 11 dígitos (com ou sem DDD)
        return numbers.length >= 10 && numbers.length <= 11;
    }
    
    /**
     * Valida se um CEP é válido
     * @param {string} postalCode - CEP a ser validado
     * @returns {boolean} - true se o CEP for válido
     */
    static isValidPostalCode(postalCode) {
        // Remove caracteres não numéricos
        const numbers = postalCode.replace(/\D/g, '');
        
        // CEP brasileiro tem 8 dígitos
        return numbers.length === 8;
    }
    
    /**
     * Valida se uma data é válida
     * @param {string} dateStr - Data a ser validada
     * @returns {boolean} - true se a data for válida
     */
    static isValidDate(dateStr) {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    }
}

module.exports = BaseValidator;
