const ProductService = require('../../services/product.service');
const SellerService = require('../../services/seller.service');
const NsProductsService = require('../../services/ns/products.service');
const { formatError, createError } = require('../../utils/errorHandler');

// Função utilitária para validação DRY
function isProductFromSeller(product, sellerId) {
    return product && product.seller_id && product.seller_id.toString() === sellerId.toString();
}

class SellerProductsController {
    /**
     * Lista todos os produtos de um seller específico
     */
    async getProducts(req, res) {
        try {
            const { seller_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Buscar produtos do seller
            const result = await ProductService.getAll(seller_id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar produtos do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Busca um produto específico de um seller
     */
    async getProductById(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Buscar o produto
            const productResult = await ProductService.get(product_id);
            
            if (!productResult.success) {
                return res.status(productResult.status || 404).json(productResult);
            }
            
            // Verificar se o produto pertence ao seller
            if (!isProductFromSeller(productResult.data, seller_id)) {
                return res.status(403).json(createError('Este produto não pertence ao vendedor especificado', 403));
            }
            
            return res.json({
                success: true,
                data: productResult.data
            });
        } catch (error) {
            console.error(`Erro ao buscar produto ID ${req.params.product_id} do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Cria um novo produto para um seller
     */
    async createProduct(req, res) {
        try {
            const { seller_id } = req.params;
            const productData = req.body;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Adicionar o seller_id aos dados do produto
            productData.seller_id = seller_id;
            
            // Criar o produto
            const result = await ProductService.create(productData);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json({
                success: true,
                message: 'Produto criado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao criar produto para o seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Atualiza um produto de um seller
     */
    async updateProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            const productData = req.body;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Verificar se o produto existe
            const productResult = await ProductService.get(product_id);
            
            if (!productResult.success) {
                return res.status(productResult.status || 404).json(productResult);
            }
            
            // Verificar se o produto pertence ao seller
            if (!isProductFromSeller(productResult.data, seller_id)) {
                return res.status(403).json(createError('Este produto não pertence ao vendedor especificado', 403));
            }
            
            // Manter o seller_id original
            productData.seller_id = seller_id;
            
            // Atualizar o produto
            const result = await ProductService.update(product_id, productData);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Produto atualizado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao atualizar produto ID ${req.params.product_id} do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Remove um produto de um seller
     */
    async deleteProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            
            // Verificar se o produto existe
            const productResult = await ProductService.get(product_id);
            
            if (!productResult.success) {
                return res.status(productResult.status || 404).json(productResult);
            }
            
            // Verificar se o produto pertence ao seller
            if (!isProductFromSeller(productResult.data, seller_id)) {
                return res.status(403).json(createError('Este produto não pertence ao vendedor especificado', 403));
            }
            
            // Excluir o produto
            const result = await ProductService.delete(product_id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Produto excluído com sucesso'
            });
        } catch (error) {
            console.error(`Erro ao excluir produto ID ${req.params.product_id} do seller ID ${req.params.seller_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }

    /**
     * Sincroniza um produto do seller com a Nuvemshop
     */
    async syncProduct(req, res) {
        try {
            const { seller_id, product_id } = req.params;
            // Verificar se o seller existe
            const sellerResult = await SellerService.get(seller_id);
            if (!sellerResult.success) {
                return res.status(sellerResult.status || 404).json(sellerResult);
            }
            // Verificar se o produto existe
            const productResult = await ProductService.get(product_id);
            if (!productResult.success) {
                return res.status(productResult.status || 404).json(productResult);
            }
            // Verificar se o produto pertence ao seller
            if (!isProductFromSeller(productResult.data, seller_id)) {
                return res.status(403).json(createError('Este produto não pertence ao vendedor especificado', 403));
            }
            // Garantir objeto plano e id como string
            let productPlain = productResult.data;
            if (typeof productPlain.get === 'function') {
                productPlain = productPlain.get({ plain: true });
            }
            // Adicionar/atualizar tag appns_prod_id
            const tag = `appns_prod_id:${productPlain.id}`;
            let tagsArr = [];
            if (productPlain.tags) {
                if (Array.isArray(productPlain.tags)) {
                    tagsArr = productPlain.tags;
                } else if (typeof productPlain.tags === 'string' && productPlain.tags.length > 0) {
                    tagsArr = productPlain.tags.split(',').map(t => t.trim()).filter(Boolean);
                }
            }
            if (!tagsArr.includes(tag)) tagsArr.push(tag);
            const tags = tagsArr.join(',');
            // Atualizar o produto localmente com a tag
            await ProductService.update(product_id, { tags });
            // Montar objeto para sync
            const productToSync = { ...productPlain, id: productPlain.id.toString(), tags };
            // Chamar sync do service NS
            const result = await NsProductsService.syncProduct(
                sellerResult.data.nuvemshop_id,
                sellerResult.data.nuvemshop_api_token,
                productToSync
            );
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('Erro ao sincronizar produto com a Nuvemshop:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new SellerProductsController();