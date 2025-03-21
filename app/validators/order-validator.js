class OrderValidator {
    static validateOrderData(orderData) {
        const errors = [];

        // Validar campos obrigatórios
        if (!orderData.seller_id) {
            errors.push("O campo 'seller_id' é obrigatório.");
        }

        if (!orderData.shopper_id) {
            errors.push("O campo 'shopper_id' é obrigatório.");
        }

        if (!orderData.products) {
            errors.push("O campo 'products' é obrigatório.");
        } else if (!Array.isArray(orderData.products) && typeof orderData.products !== 'object') {
            errors.push("O campo 'products' deve ser um array ou objeto válido.");
        }

        if (!orderData.customer_info) {
            errors.push("O campo 'customer_info' é obrigatório.");
        }

        if (!orderData.value) {
            errors.push("O campo 'value' é obrigatório.");
        } else if (isNaN(parseFloat(orderData.value))) {
            errors.push("O campo 'value' deve ser um número válido.");
        }

        if (!orderData.cycle) {
            errors.push("O campo 'cycle' é obrigatório.");
        }

        if (!orderData.next_due_date) {
            errors.push("O campo 'next_due_date' é obrigatório.");
        } else {
            const dateObj = new Date(orderData.next_due_date);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'next_due_date' deve ser uma data válida.");
            }
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

    static validateOrderUpdateData(orderData) {
        const errors = [];

        // Para atualizações, validamos apenas os campos que foram fornecidos
        if (orderData.seller_id === "") {
            errors.push("O campo 'seller_id' não pode ser vazio.");
        }

        if (orderData.shopper_id === "") {
            errors.push("O campo 'shopper_id' não pode ser vazio.");
        }

        if (orderData.products !== undefined && 
            !Array.isArray(orderData.products) && 
            typeof orderData.products !== 'object') {
            errors.push("O campo 'products' deve ser um array ou objeto válido.");
        }

        if (orderData.value !== undefined && isNaN(parseFloat(orderData.value))) {
            errors.push("O campo 'value' deve ser um número válido.");
        }

        if (orderData.next_due_date !== undefined) {
            const dateObj = new Date(orderData.next_due_date);
            if (isNaN(dateObj.getTime())) {
                errors.push("O campo 'next_due_date' deve ser uma data válida.");
            }
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
     * Valida se o comprador existe no sistema
     * @param {string|number} shopperId - ID do comprador
     * @param {object} Shopper - Modelo Sequelize do Shopper
     * @returns {Promise<boolean>} - Retorna true se o comprador existir
     */
    static async validateShopperExists(shopperId, Shopper) {
        if (!shopperId) {
            const error = new Error("ID do comprador é obrigatório");
            error.statusCode = 400;
            throw error;
        }

        const shopper = await Shopper.findByPk(shopperId);
        
        if (!shopper) {
            const error = new Error(`Comprador com ID ${shopperId} não encontrado`);
            error.statusCode = 404;
            throw error;
        }
        
        return true;
    }

    /**
     * Valida se o vendedor existe no sistema
     * @param {string|number} sellerId - ID do vendedor
     * @param {object} Seller - Modelo Sequelize do Seller
     * @returns {Promise<boolean>} - Retorna true se o vendedor existir
     */
    static async validateSellerExists(sellerId, Seller) {
        if (!sellerId) {
            const error = new Error("ID do vendedor é obrigatório");
            error.statusCode = 400;
            throw error;
        }

        const seller = await Seller.findByPk(sellerId);
        
        if (!seller) {
            const error = new Error(`Vendedor com ID ${sellerId} não encontrado`);
            error.statusCode = 404;
            throw error;
        }
        
        return true;
    }
}

module.exports = OrderValidator;
