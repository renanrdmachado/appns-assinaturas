const BaseValidator = require('./base-validator');

class ProductValidator extends BaseValidator {
    /**
     * Valida dados para criação de produto
     */
    static validateCreate(data) {
        const errors = [];

        // Nome é obrigatório
        if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
            errors.push('Nome do produto é obrigatório');
        }

        // Seller ID é obrigatório
        if (!data.seller_id) {
            errors.push('ID do seller é obrigatório');
        }

        // Preço é obrigatório e deve ser um número válido
        if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0) {
            errors.push('Preço deve ser um valor numérico maior que zero');
        }

        // Validar subscription_price se fornecido
        if (data.subscription_price !== undefined && data.subscription_price !== null) {
            if (isNaN(parseFloat(data.subscription_price)) || parseFloat(data.subscription_price) <= 0) {
                errors.push('Preço de assinatura deve ser um valor numérico maior que zero');
            }
        }

        // Validar stock se fornecido
        if (data.stock !== undefined && data.stock !== null) {
            if (isNaN(parseInt(data.stock)) || parseInt(data.stock) < 0) {
                errors.push('Estoque deve ser um número inteiro não negativo');
            }
        }

        // Validar categories se fornecido
        if (data.categories !== undefined && data.categories !== null) {
            if (!Array.isArray(data.categories)) {
                errors.push('Categorias devem ser um array');
            }
        }

        // Validar images se fornecido
        if (data.images !== undefined && data.images !== null) {
            if (!Array.isArray(data.images)) {
                errors.push('Imagens devem ser um array');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Valida dados para atualização de produto
     */
    static validateUpdate(data) {
        const errors = [];

        // Nome se fornecido
        if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
            errors.push('Nome do produto deve ser uma string não vazia');
        }

        // Preço se fornecido
        if (data.price !== undefined && (isNaN(parseFloat(data.price)) || parseFloat(data.price) <= 0)) {
            errors.push('Preço deve ser um valor numérico maior que zero');
        }

        // Validar subscription_price se fornecido
        if (data.subscription_price !== undefined && data.subscription_price !== null) {
            if (isNaN(parseFloat(data.subscription_price)) || parseFloat(data.subscription_price) <= 0) {
                errors.push('Preço de assinatura deve ser um valor numérico maior que zero');
            }
        }

        // Validar stock se fornecido
        if (data.stock !== undefined && data.stock !== null) {
            if (isNaN(parseInt(data.stock)) || parseInt(data.stock) < 0) {
                errors.push('Estoque deve ser um número inteiro não negativo');
            }
        }

        // Validar categories se fornecido
        if (data.categories !== undefined && data.categories !== null) {
            if (!Array.isArray(data.categories)) {
                errors.push('Categorias devem ser um array');
            }
        }

        // Validar images se fornecido
        if (data.images !== undefined && data.images !== null) {
            if (!Array.isArray(data.images)) {
                errors.push('Imagens devem ser um array');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitiza dados do produto
     */
    static sanitize(data) {
        const sanitized = { ...data };

        // Sanitizar strings
        if (sanitized.name) sanitized.name = sanitized.name.trim();
        if (sanitized.description) sanitized.description = sanitized.description.trim();
        if (sanitized.sku) sanitized.sku = sanitized.sku.trim();
        if (sanitized.tags) sanitized.tags = sanitized.tags.trim();

        // Converter números
        if (sanitized.price) sanitized.price = parseFloat(sanitized.price);
        if (sanitized.subscription_price) sanitized.subscription_price = parseFloat(sanitized.subscription_price);
        if (sanitized.stock) sanitized.stock = parseInt(sanitized.stock);

        return sanitized;
    }

    /**
     * Formata dados do produto para resposta da API
     */
    static formatForResponse(product) {
        const formatted = {
            id: product.id,
            seller_id: product.seller_id,
            name: product.name,
            price: product.price,
            subscription_price: product.subscription_price,
            unit_price: product.getUnitPrice(),
            subscription_price_calculated: product.getSubscriptionPrice(),
            has_subscription_pricing: product.subscription_price !== null && product.subscription_price !== product.price,
            stock: product.stock,
            sku: product.sku,
            description: product.description,
            categories: product.categories,
            images: product.images,
            tags: product.tags,
            created_at: product.createdAt,
            updated_at: product.updatedAt
        };

        return formatted;
    }

    /**
     * Formata dados do produto para sincronização com APIs externas
     */
    static formatForSync(product, syncType = 'nuvemshop') {
        switch (syncType) {
            case 'nuvemshop':
                return this.formatForNuvemshop(product);
            case 'asaas':
                return this.formatForAsaas(product);
            default:
                return product;
        }
    }

    /**
     * Formata produto para Nuvemshop
     */
    static formatForNuvemshop(product) {
        const formatted = {
            name: { pt: product.name },
            description: { pt: product.description || "" },
            handle: { pt: (product.name || "").toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
            external_id: product.id.toString(),
            tags: product.tags || "",
            variants: [
                {
                    position: 1,
                    price: String(product.getUnitPrice()),
                    sku: product.sku || "",
                    stock: product.stock || 0,
                    title: "Compra Unitária"
                }
            ]
        };

        // Adicionar variante de assinatura se houver preço diferente
        if (product.subscription_price && product.subscription_price !== product.price) {
            formatted.variants.push({
                position: 2,
                price: String(product.getSubscriptionPrice()),
                sku: (product.sku || "") + "-SUB",
                stock: product.stock || 0,
                title: "Assinatura Mensal"
            });
        }

        // Adicionar categorias se existirem
        if (product.categories && Array.isArray(product.categories)) {
            formatted.categories = product.categories
                .filter(cat => cat !== null && cat !== undefined)
                .map(cat => typeof cat === 'object' && cat.id ? parseInt(cat.id) : parseInt(cat))
                .filter(cat => !isNaN(cat));
        }

        // Adicionar imagens se existirem
        if (product.images && Array.isArray(product.images)) {
            formatted.images = product.images
                .filter(img => img !== null && img !== undefined)
                .map(img => typeof img === 'string' ? { src: img } : img)
                .filter(img => img && img.src);
        }

        return formatted;
    }

    /**
     * Formata produto para Asaas
     */
    static formatForAsaas(product) {
        return {
            id: product.id.toString(),
            name: product.name,
            value: product.getUnitPrice(),
            subscription_value: product.getSubscriptionPrice()
        };
    }
}

module.exports = ProductValidator;
