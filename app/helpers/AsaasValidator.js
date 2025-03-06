class AsaasValidator {
    static validateCustomerData(customerData) {
        if (!customerData.name) {
            const error = new Error("O campo 'name' é obrigatório.");
            error.statusCode = 400;
            throw error;
        }
        if (!customerData.cpfCnpj) {
            const error = new Error("O campo 'cpfCnpj' é obrigatório.");
            error.statusCode = 400;
            throw error;
        }
        // ...adicione mais validações se necessário...
    }

    static validateSubAccountData(accountData) {
        const errors = [];
        if (!accountData.name) {
            errors.push("O campo 'name' é obrigatório.");
        }
        if (!accountData.email) {
            errors.push("O campo 'email' é obrigatório.");
        }
        // ...existing validations...
        if (errors.length > 0) {
            const error = new Error(errors.join(" "));
            error.statusCode = 400;
            throw error;
        }
    }
}

module.exports = AsaasValidator;
