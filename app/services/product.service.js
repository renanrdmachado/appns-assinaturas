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

            // Validar subscription_price se fornecido
            if (data.subscription_price !== undefined && data.subscription_price !== null) {
                if (isNaN(parseFloat(data.subscription_price))) {
                    return createError('Preço de assinatura deve ser um valor numérico válido', 400);
                }
            }
            
            const product = await Product.create({
                seller_id: data.seller_id,
                name: data.name,
                price: data.price,
                subscription_price: data.subscription_price || null,
                stock: data.stock,
                sku: data.sku,
                description: data.description,
                categories: data.categories,
                images: data.images,
                tags: data.tags
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

            // Validar subscription_price se fornecido
            if (data.subscription_price !== undefined && data.subscription_price !== null) {
                if (isNaN(parseFloat(data.subscription_price))) {
                    return createError('Preço de assinatura deve ser um valor numérico válido', 400);
                }
            }

            await product.update({
                seller_id: data.seller_id !== undefined ? data.seller_id : product.seller_id,
                name: data.name !== undefined ? data.name : product.name,
                price: data.price !== undefined ? data.price : product.price,
                subscription_price: data.subscription_price !== undefined ? data.subscription_price : product.subscription_price,
                stock: data.stock !== undefined ? data.stock : product.stock,
                sku: data.sku !== undefined ? data.sku : product.sku,
                description: data.description !== undefined ? data.description : product.description,
                categories: data.categories !== undefined ? data.categories : product.categories,
                images: data.images !== undefined ? data.images : product.images,
                tags: data.tags !== undefined ? data.tags : product.tags
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

    /**
     * Busca o seller de um produto pelo ID do produto
     * @param {number} productId - ID do produto
     * @returns {Object} - Dados do seller
     */
    async getSellerByProductId(productId) {
        try {
            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }

            // Buscar o produto com seu seller
            const product = await Product.findOne({
                where: { id: productId },
                attributes: ['id', 'name', 'seller_id']
            });

            if (!product) {
                return createError(`Produto com ID ${productId} não encontrado`, 404);
            }

            // Buscar o seller completo
            const SellerService = require('./seller.service');
            const sellerResult = await SellerService.get(product.seller_id);

            if (!sellerResult.success) {
                return createError(`Seller ${product.seller_id} não encontrado para o produto ${productId}`, 404);
            }

            return {
                success: true,
                data: {
                    product: {
                        id: product.id,
                        name: product.name,
                        seller_id: product.seller_id
                    },
                    seller: sellerResult.data
                }
            };

        } catch (error) {
            console.error('Erro ao buscar seller pelo produto:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new ProductService();
