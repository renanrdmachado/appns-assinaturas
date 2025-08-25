const BaseValidator = require('./base-validator');

class OrderValidator extends BaseValidator {
    static validateOrderData(orderData) {
        const errors = [];

        if (!orderData) {
            this.throwError("Dados do pedido são obrigatórios", 400);
        }

    // Validar campos obrigatórios (seller_id será determinado automaticamente pelo produto)
    // Importante: Order não armazena mais dados de assinatura (value, cycle, next_due_date)
    const requiredFields = ['shopper_id', 'product_id', 'customer_info', 'value'];
        errors.push(...this.validateRequiredFields(orderData, requiredFields, 'pedido'));
        
        // Validações específicas
        if (orderData.product_id !== undefined && (orderData.product_id === '' || isNaN(orderData.product_id))) {
            errors.push("O campo 'product_id' deve ser um ID válido.");
        }
        if (orderData.value !== undefined && (isNaN(orderData.value) || parseFloat(orderData.value) <= 0)) {
            errors.push("O campo 'value' deve ser um número positivo.");
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

        if (orderData.product_id !== undefined && (orderData.product_id === '' || isNaN(orderData.product_id))) {
            errors.push("O campo 'product_id' deve ser um ID válido.");
        }
        if (orderData.value !== undefined && (isNaN(orderData.value) || parseFloat(orderData.value) <= 0)) {
            errors.push("O campo 'value' deve ser um número positivo.");
        }

    // Campos de assinatura foram removidos do Order; não validar aqui

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
