const NsApiClient = require('../../helpers/NsApiClient');
const { formatError, createError } = require('../../utils/errorHandler');
const { checkSubscriptionMiddleware } = require('../../utils/subscription-validator');

class SellerProductsService {
    async getProducts(sellerId, storeId, accessToken, params = {}) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            console.log(`SellerProductsService: Buscando produtos para seller ${sellerId}, storeId: ${storeId}`);
            
            if (!storeId || String(storeId).trim() === '') {
                console.error('Erro em SellerProductsService: storeId inválido');
                return createError('ID da loja é obrigatório', 400);
            }
            
            if (!accessToken || String(accessToken).trim() === '') {
                console.error('Erro em SellerProductsService: accessToken inválido');
                return createError('Token de acesso é obrigatório', 400);
            }
            
            const paramsFormatted = new URLSearchParams(params);
            console.log(`Parâmetros da requisição: ${paramsFormatted.toString() || 'nenhum'}`);
            
            const products = await NsApiClient.get({
                storeId,
                endpoint: 'products',
                accessToken,
                params: paramsFormatted
            });
            
            console.log(`Produtos encontrados: ${products.length || 0}`);
            return { success: true, data: products };
        } catch (error) {
            console.error('Erro ao obter produtos da Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async getProductById(sellerId, storeId, accessToken, productId) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            const product = await NsApiClient.get({
                storeId,
                endpoint: `products/${productId}`,
                accessToken
            });
            
            return { success: true, data: product };
        } catch (error) {
            console.error(`Erro ao obter produto ${productId} da Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async createProduct(sellerId, storeId, accessToken, productData) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            if (!productData || !productData.name) {
                return createError('Dados do produto são obrigatórios', 400);
            }
            
            const product = await NsApiClient.post({
                storeId,
                endpoint: 'products',
                accessToken,
                data: productData
            });
            
            return { success: true, data: product };
        } catch (error) {
            console.error('Erro ao criar produto na Nuvemshop:', error.message);
            return formatError(error);
        }
    }
    
    async updateProduct(sellerId, storeId, accessToken, productId, productData) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            if (!productData) {
                return createError('Dados do produto são obrigatórios', 400);
            }
            
            const product = await NsApiClient.put({
                storeId,
                endpoint: `products/${productId}`,
                accessToken,
                data: productData
            });
            
            return { success: true, data: product };
        } catch (error) {
            console.error(`Erro ao atualizar produto ${productId} na Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async deleteProduct(sellerId, storeId, accessToken, productId) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            await NsApiClient.delete({
                storeId,
                endpoint: `products/${productId}`,
                accessToken
            });
            
            return { success: true, message: 'Produto excluído com sucesso' };
        } catch (error) {
            console.error(`Erro ao excluir produto ${productId} da Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    async getProductVariants(sellerId, storeId, accessToken, productId) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            const variants = await NsApiClient.get({
                storeId,
                endpoint: `products/${productId}/variants`,
                accessToken
            });
            
            return { success: true, data: variants };
        } catch (error) {
            console.error(`Erro ao obter variantes do produto ${productId} da Nuvemshop:`, error.message);
            return formatError(error);
        }
    }
    
    /**
     * Sincroniza um produto local com a Nuvemshop (criar ou atualizar)
     * @param {string} sellerId - ID do seller
     * @param {string} storeId - ID da loja na Nuvemshop
     * @param {string} accessToken - Token de acesso à API da Nuvemshop
     * @param {Object} product - Produto do banco de dados local
     */
    async syncProduct(sellerId, storeId, accessToken, product) {
        try {
            // Validar assinatura do seller antes de prosseguir
            const subscriptionCheck = await checkSubscriptionMiddleware(sellerId);
            if (!subscriptionCheck.success) {
                return subscriptionCheck;
            }

            console.log(`Sincronizando produto ID ${product.id} com a Nuvemshop para seller ${sellerId}`);
            
            if (!storeId || String(storeId).trim() === '') {
                console.error('Erro em syncProduct: storeId inválido');
                return createError('ID da loja é obrigatório', 400);
            }
            
            if (!accessToken || String(accessToken).trim() === '') {
                console.error('Erro em syncProduct: accessToken inválido');
                return createError('Token de acesso é obrigatório', 400);
            }

            // Tratar o campo categories - corrigindo o formato para a API da Nuvemshop
            let categories = [];
            if (product.categories) {
                // Se for uma string JSON, converter para objeto
                if (typeof product.categories === 'string') {
                    try {
                        categories = JSON.parse(product.categories);
                    } catch (e) {
                        console.error('Erro ao fazer parse das categorias:', e.message);
                        categories = [];
                    }
                } else if (Array.isArray(product.categories)) {
                    categories = product.categories;
                }
                
                // Garantir que todos os elementos são números inteiros
                categories = categories
                    .filter(cat => cat !== null && cat !== undefined)
                    .map(cat => {
                        if (typeof cat === 'object' && cat.id) {
                            return parseInt(cat.id, 10);
                        }
                        return parseInt(cat, 10);
                    })
                    .filter(cat => !isNaN(cat));
            }
            
            // Tratar o campo images - corrigindo o formato para a API da Nuvemshop
            let images = [];
            if (product.images) {
                // Se for uma string JSON, converter para objeto
                if (typeof product.images === 'string') {
                    try {
                        images = JSON.parse(product.images);
                    } catch (e) {
                        console.error('Erro ao fazer parse das imagens:', e.message);
                        images = [];
                    }
                } else if (Array.isArray(product.images)) {
                    images = product.images;
                }
                
                // Garantir o formato correto de cada imagem
                images = images
                    .filter(img => img !== null && img !== undefined)
                    .map(img => {
                        if (typeof img === 'string') {
                            return { src: img };
                        } else if (typeof img === 'object' && img.src) {
                            return { src: img.src };
                        }
                        return null;
                    })
                    .filter(img => img !== null);
            }
            
            // Mapear produto local para o formato da Nuvemshop
            const nsProductData = {
                name: { pt: product.name },
                description: { pt: product.description || "" },
                handle: { pt: (product.name || "").toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/^-+|-+$/g, '') // remove hífens do início e fim
                    .replace(/-+/g, '-') || 'produto' }, // fallback se ficar vazio
                categories: categories, // array de ids
                tags: product.tags || "",
                published: true,
                free_shipping: false,
                variants: [
                    {
                        price: String(product.price), // Apenas o preço unitário vai para a Nuvemshop
                        sku: product.sku || "",
                        stock: product.stock || 0,
                        stock_management: true
                    }
                ]
            };

            // Adicionar external_id apenas se for permitido pela API
            if (product.id) {
                nsProductData.external_id = product.id.toString();
            }

            // Adicionar imagens apenas se houver
            if (images && images.length > 0) {
                nsProductData.images = images;
            }
            
            // Log dos dados formatados para debug
            console.log('Dados do produto formatados para a Nuvemshop:', JSON.stringify(nsProductData, null, 2));
            
            // Verificar se o produto já existe na Nuvemshop pelo external_id
            const params = new URLSearchParams({
                q: product.id.toString()
            });
            
            console.log(`Verificando se o produto já existe na Nuvemshop com external_id: ${product.id}`);
            
            const searchResult = await this.getProducts(sellerId, storeId, accessToken, params);
            
            // Se houver erro na pesquisa, retorna o erro
            if (!searchResult.success) {
                return searchResult;
            }
            
            // Verificar se encontrou produtos com o external_id correspondente
            const existingProducts = searchResult.data.filter(p => 
                p.external_id === product.id.toString()
            );
            
            let result;
            
            if (existingProducts.length > 0) {
                // Produto já existe, atualizar
                const nsProductId = existingProducts[0].id;
                console.log(`Atualizando produto existente na Nuvemshop ID: ${nsProductId}`);
                
                // Para atualização, usar dados mais limpos
                const productDataForUpdate = {
                    name: nsProductData.name,
                    description: nsProductData.description,
                    variants: nsProductData.variants,
                    tags: nsProductData.tags
                };
                
                if (nsProductData.categories && nsProductData.categories.length > 0) {
                    productDataForUpdate.categories = nsProductData.categories;
                }
                
                result = await this.updateProduct(
                    sellerId,
                    storeId,
                    accessToken,
                    nsProductId,
                    productDataForUpdate
                );
                
                if (result.success) {
                    result.message = 'Produto atualizado com sucesso na Nuvemshop';
                    result.nuvemshop_id = nsProductId;
                }
            } else {
                // Produto não existe, criar
                console.log('Criando novo produto na Nuvemshop');
                
                // Para criação, usar dados mínimos e válidos
                const productDataForCreate = {
                    name: nsProductData.name,
                    description: nsProductData.description,
                    published: true,
                    variants: nsProductData.variants
                };
                
                // Adicionar campos opcionais apenas se válidos
                if (nsProductData.tags) {
                    productDataForCreate.tags = nsProductData.tags;
                }
                
                if (nsProductData.categories && nsProductData.categories.length > 0) {
                    productDataForCreate.categories = nsProductData.categories;
                }
                
                if (nsProductData.attributes && nsProductData.attributes.length > 0) {
                    productDataForCreate.attributes = nsProductData.attributes;
                }
                
                if (nsProductData.handle) {
                    productDataForCreate.handle = nsProductData.handle;
                }
                
                result = await this.createProduct(
                    sellerId,
                    storeId,
                    accessToken,
                    productDataForCreate
                );
                
                if (result.success) {
                    result.message = 'Produto criado com sucesso na Nuvemshop';
                    result.nuvemshop_id = result.data.id;
                    
                    // Após criar, tentar adicionar external_id via update se necessário
                    if (product.id && result.data.id) {
                        try {
                            console.log(`Adicionando external_id ao produto criado: ${result.data.id}`);
                            await this.updateProduct(
                                sellerId,
                                storeId,
                                accessToken,
                                result.data.id,
                                { external_id: product.id.toString() }
                            );
                        } catch (externalIdError) {
                            console.warn(`Aviso: Não foi possível adicionar external_id: ${externalIdError.message}`);
                        }
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('Erro ao sincronizar produto com a Nuvemshop:', error.message);
            
            // Melhorar tratamento de erros específicos da Nuvemshop
            if (error.nsError && error.nsError.originalError) {
                // Formatação específica para erros de validação (422)
                const errorResponse = {
                    success: false,
                    message: 'Erro de validação na Nuvemshop',
                    status: 422
                };
                
                // Adicionar detalhes do erro
                if (error.nsError.originalError) {
                    errorResponse.nsDetails = error.nsError.originalError;
                    
                    // Extrair mensagens de erro específicas
                    const validationErrors = [];
                    for (const field in error.nsError.originalError) {
                        if (Array.isArray(error.nsError.originalError[field])) {
                            error.nsError.originalError[field].forEach(errMsg => {
                                validationErrors.push(`${field}: ${errMsg}`);
                            });
                        }
                    }
                    
                    if (validationErrors.length > 0) {
                        errorResponse.errors = validationErrors;
                    }
                }
                
                return errorResponse;
            }
            
            return formatError(error);
        }
    }
}

module.exports = new SellerProductsService();
