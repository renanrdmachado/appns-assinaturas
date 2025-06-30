const BaseValidator = require('./base-validator');

class OrderValidator extends BaseValidator {
    static validateOrderData(orderData) {
        const errors = [];

        if (!orderData) {
            this.throwError("Dados do pedido são obrigatórios", 400);
        }

        // Validar campos obrigatórios (seller_id será determinado automaticamente pelos produtos)
        const requiredFields = ['shopper_id', 'products', 'customer_info', 
                             'value', 'cycle', 'next_due_date'];
        errors.push(...this.validateRequiredFields(orderData, requiredFields, 'pedido'));
        
        // Validações específicas
        if (orderData.products && (!Array.isArray(orderData.products) && typeof orderData.products !== 'object')) {
            errors.push("O campo 'products' deve ser um array ou objeto válido.");
        }

        if (orderData.value && isNaN(parseFloat(orderData.value))) {
            errors.push("O campo 'value' deve ser um número válido.");
        }

        if (orderData.next_due_date && !this.isValidDate(orderData.next_due_date)) {
            errors.push("O campo 'next_due_date' deve ser uma data válida.");
        }

        return this.throwValidationErrors(errors);
    }

    static validateOrderUpdateData(orderData) {
        const errors = [];

        if (!orderData || Object.keys(orderData).length === 0) {
            this.throwError("Nenhum dado fornecido para atualização do pedido", 400);
        }

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

        if (orderData.next_due_date !== undefined && !this.isValidDate(orderData.next_due_date)) {
            errors.push("O campo 'next_due_date' deve ser uma data válida.");
        }

        return this.throwValidationErrors(errors);
    }

    /**
     * Valida se o comprador existe no sistema
     * @param {string|number} shopperId - ID do comprador
     * @param {object} Shopper - Modelo Sequelize do Shopper
     * @returns {Promise<boolean>} - Retorna true se o comprador existir
     */
    static async validateShopperExists(shopperId, Shopper) {
        if (!shopperId) {
            this.throwError("ID do comprador é obrigatório", 400);
        }

        const shopper = await Shopper.findByPk(shopperId);
        
        if (!shopper) {
            this.throwError(`Comprador com ID ${shopperId} não encontrado`, 404);
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
        console.log('DEBUG - Validator - validateSellerExists chamado com:', sellerId, typeof sellerId);
        
        if (!sellerId) {
            this.throwError("ID do vendedor é obrigatório", 400);
        }

        const seller = await Seller.findByPk(sellerId);
        console.log('DEBUG - Validator - Seller encontrado:', seller ? `ID: ${seller.id}` : 'null');
        
        if (!seller) {
            this.throwError(`Vendedor com ID ${sellerId} não encontrado`, 404);
        }
        
        return true;
    }
}

module.exports = OrderValidator;
