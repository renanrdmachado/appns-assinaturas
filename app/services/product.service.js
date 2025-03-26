const Product = require('../models/Product');
const { formatError, createError } = require('../utils/errorHandler');

class ProductService {
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const product = await Product.findOne({
                where: { id: id },
            });
            console.log("Service / Product: ", product);
            
            if (!product) {
                return createError(`Produto com ID ${id} não encontrado`, 404);
            }
            
            return { success: true, data: product };
        } catch (error) {
            console.error('Erro ao buscar produto:', error.message);
            return formatError(error);
        }
    }
    
    async getAll(sellerId = null) {
        try {
            const whereClause = sellerId ? { seller_id: sellerId } : {};
            const products = await Product.findAll({
                where: whereClause,
            });
            
            console.log("Service / All Products count: ", products.length);
            return { success: true, data: products };
        } catch (error) {
            console.error('Erro ao buscar produtos:', error.message);
            return formatError(error);
        }
    }

    async create(data) {
        console.log('Product - creating...');
        try {
            // Validação básica de campos obrigatórios
            if (!data.name) {
                return createError('Nome do produto é obrigatório', 400);
            }
            
            if (!data.price || isNaN(parseFloat(data.price))) {
                return createError('Preço deve ser um valor numérico válido', 400);
            }
            
            const product = await Product.create({
                seller_id: data.seller_id,
                name: data.name,
                price: data.price,
                stock: data.stock,
                sku: data.sku,
                description: data.description,
                categories: data.categories,
                images: data.images
            });
            
            console.log('Product created:', product.toJSON());
            return { success: true, data: product.toJSON() };
        } catch (error) {
            console.error('Erro ao criar produto:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const product = await Product.findByPk(id);
            
            if (!product) {
                return createError(`Produto com ID ${id} não encontrado`, 404);
            }
            
            // Validação básica
            if (data.price !== undefined && isNaN(parseFloat(data.price))) {
                return createError('Preço deve ser um valor numérico válido', 400);
            }
            
            await product.update({
                seller_id: data.seller_id,
                name: data.name,
                price: data.price,
                stock: data.stock,
                sku: data.sku,
                description: data.description,
                categories: data.categories,
                images: data.images
            });
            
            console.log('Product updated:', product.toJSON());
            return { success: true, data: product.toJSON() };
        } catch (error) {
            console.error('Erro ao atualizar produto:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const product = await Product.findByPk(id);
            
            if (!product) {
                return createError(`Produto com ID ${id} não encontrado`, 404);
            }
            
            await product.destroy();
            console.log(`Produto com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Produto com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir produto:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new ProductService();
