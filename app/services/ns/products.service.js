const NsApiClient = require('../../helpers/NsApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

class NsProductsService {
    async getProducts(storeId, accessToken, params = {}) {
        try {
            console.log(`NsProductsService: Buscando produtos para storeId: ${storeId}`);
            
            if (!storeId || String(storeId).trim() === '') {
                console.error('Erro em NsProductsService: storeId inválido');
                return createError('ID da loja é obrigatório', 400);
            }
            
            if (!accessToken || String(accessToken).trim() === '') {
                console.error('Erro em NsProductsService: accessToken inválido');
                return createError('Token de acesso é obrigatório', 400);
            }
            
            const paramsFormatted = new URLSearchParams(params);
            console.log(`Parâmetros da requisição: ${paramsFormatted.toString() || 'nenhum'}`);
            
            const products = await NsApiClient.request({
                method: 'GET',
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
    
    async getProductById(storeId, accessToken, productId) {
        try {
            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            const product = await NsApiClient.request({
                method: 'GET',
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
    
    async createProduct(storeId, accessToken, productData) {
        try {
            if (!productData || !productData.name) {
                return createError('Dados do produto são obrigatórios', 400);
            }
            
            const product = await NsApiClient.request({
                method: 'POST',
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
    
    async updateProduct(storeId, accessToken, productId, productData) {
        try {
            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            if (!productData) {
                return createError('Dados do produto são obrigatórios', 400);
            }
            
            const product = await NsApiClient.request({
                method: 'PUT',
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
    
    async deleteProduct(storeId, accessToken, productId) {
        try {
            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            await NsApiClient.request({
                method: 'DELETE',
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
    
    async getProductVariants(storeId, accessToken, productId) {
        try {
            if (!productId) {
                return createError('ID do produto é obrigatório', 400);
            }
            
            const variants = await NsApiClient.request({
                method: 'GET',
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
     * @param {string} storeId - ID da loja na Nuvemshop
     * @param {string} accessToken - Token de acesso à API da Nuvemshop
     * @param {Object} product - Produto do banco de dados local
     */
    async syncProduct(storeId, accessToken, product) {
        try {
            console.log(`Sincronizando produto ID ${product.id} com a Nuvemshop`);
            
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
                name: product.name,
                price: String(product.price),
                stock: product.stock || 0,
                sku: product.sku || "",
                description: product.description || "",
                categories: categories, // Agora com formato correto
                external_id: product.id.toString()
            };
            
            // Log dos dados formatados para debug
            console.log('Dados do produto formatados para a Nuvemshop:', JSON.stringify(nsProductData, null, 2));
            
            // Verificar se o produto já existe na Nuvemshop pelo external_id
            const params = new URLSearchParams({
                q: product.id.toString()
            });
            
            console.log(`Verificando se o produto já existe na Nuvemshop com external_id: ${product.id}`);
            
            const searchResult = await this.getProducts(storeId, accessToken, params);
            
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
                
                // Se for uma atualização, enviar as imagens separadamente para evitar problemas
                const productDataForUpdate = { ...nsProductData };
                delete productDataForUpdate.images; // Remover imagens para evitar erro 422
                
                result = await this.updateProduct(
                    storeId,
                    accessToken,
                    nsProductId,
                    productDataForUpdate
                );
                
                // Adicionar imagens separadamente se houver
                if (result.success && images.length > 0) {
                    try {
                        console.log(`Atualizando imagens do produto ${nsProductId} separadamente...`);
                        // Aqui você poderia implementar uma função específica para atualizar imagens
                        // Isso seria ideal para uma implementação futura
                    } catch (imgError) {
                        console.warn(`Aviso: Erro ao atualizar imagens: ${imgError.message}`);
                    }
                }
                
                if (result.success) {
                    result.message = 'Produto atualizado com sucesso na Nuvemshop';
                    result.nuvemshop_id = nsProductId;
                }
            } else {
                // Produto não existe, criar
                console.log('Criando novo produto na Nuvemshop');
                
                // Para criação, enviar dados mínimos primeiro e depois atualizar com imagens
                const productDataForCreate = { ...nsProductData };
                delete productDataForCreate.images; // Remover imagens para evitar erro 422
                
                result = await this.createProduct(
                    storeId,
                    accessToken,
                    productDataForCreate
                );
                
                // Adicionar imagens separadamente se houver
                if (result.success && images.length > 0) {
                    try {
                        console.log(`Adicionando imagens ao produto recém-criado ${result.data.id}...`);
                        // Implementação futura para adicionar imagens
                    } catch (imgError) {
                        console.warn(`Aviso: Erro ao adicionar imagens: ${imgError.message}`);
                    }
                }
                
                if (result.success) {
                    result.message = 'Produto criado com sucesso na Nuvemshop';
                    result.nuvemshop_id = result.data.id;
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

module.exports = new NsProductsService();
