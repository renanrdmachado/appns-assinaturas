// Mock do NsApiClient antes de importar qualquer coisa
jest.mock('../../../helpers/NsApiClient', () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
}));

// Mock do error handler
jest.mock('../../../utils/errorHandler', () => ({
    formatError: jest.fn(error => ({ success: false, message: error.message })),
    createError: jest.fn((message, code) => ({ success: false, message, code }))
}));

// Agora importamos os módulos que serão usados
const NsProductsService = require('../../../services/ns/products.service');
const NsApiClient = require('../../../helpers/NsApiClient');
const { formatError, createError } = require('../../../utils/errorHandler');

describe('NsProductsService - Testes', () => {
    // Silenciar console.error e console.log durante os testes
    let consoleErrorSpy, consoleLogSpy;

    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterAll(() => {
        if (consoleErrorSpy) consoleErrorSpy.mockRestore();
        if (consoleLogSpy) consoleLogSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock padrão para formatError e createError
        formatError.mockImplementation((error) => ({
            success: false,
            message: error.message,
            code: error.code || 400
        }));
        createError.mockImplementation((message, code) => ({
            success: false,
            message,
            code
        }));
    });

    describe('getProducts - Listar produtos', () => {
        test('deve listar produtos com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const params = { page: 1, per_page: 10 };
            const mockProducts = [
                {
                    id: 1,
                    name: 'Produto 1',
                    price: '29.99',
                    description: 'Descrição do produto 1'
                },
                {
                    id: 2,
                    name: 'Produto 2',
                    price: '39.99',
                    description: 'Descrição do produto 2'
                }
            ];

            NsApiClient.get.mockResolvedValue(mockProducts);

            const result = await NsProductsService.getProducts(storeId, accessToken, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProducts);
            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId,
                endpoint: 'products',
                accessToken,
                params: expect.any(URLSearchParams)
            });
        });

        test('deve retornar erro quando storeId não fornecido', async () => {
            const result = await NsProductsService.getProducts('', 'token123');

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID da loja é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando accessToken não fornecido', async () => {
            const result = await NsProductsService.getProducts('123456', '');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Token de acesso é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante requisição à API', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const error = new Error('Erro de API');

            NsApiClient.get.mockRejectedValue(error);

            const result = await NsProductsService.getProducts(storeId, accessToken);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de API');
        });
    });

    describe('getProductById - Buscar produto por ID', () => {
        test('deve buscar produto por ID com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productId = '1';
            const mockProduct = {
                id: 1,
                name: 'Produto Test',
                price: '29.99',
                description: 'Descrição do produto'
            };

            NsApiClient.get.mockResolvedValue(mockProduct);

            const result = await NsProductsService.getProductById(storeId, accessToken, productId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProduct);
            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId,
                endpoint: `products/${productId}`,
                accessToken
            });
        });

        test('deve retornar erro quando productId não fornecido', async () => {
            const result = await NsProductsService.getProductById('123456', 'token123', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do produto é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante requisição à API', async () => {
            const error = new Error('Produto não encontrado');
            NsApiClient.get.mockRejectedValue(error);

            const result = await NsProductsService.getProductById('123456', 'token123', '999');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Produto não encontrado');
        });
    });

    describe('createProduct - Criar produto', () => {
        test('deve criar produto com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productData = {
                name: 'Novo Produto',
                price: '49.99',
                description: 'Descrição do novo produto'
            };
            const mockCreatedProduct = {
                id: 3,
                ...productData
            };

            NsApiClient.post.mockResolvedValue(mockCreatedProduct);

            const result = await NsProductsService.createProduct(storeId, accessToken, productData);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockCreatedProduct);
            expect(NsApiClient.post).toHaveBeenCalledWith({
                storeId,
                endpoint: 'products',
                accessToken,
                data: productData
            });
        });

        test('deve retornar erro quando dados do produto não fornecidos', async () => {
            const result = await NsProductsService.createProduct('123456', 'token123', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Dados do produto são obrigatórios');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando nome do produto não fornecido', async () => {
            const productData = { price: '49.99' }; // Sem nome

            const result = await NsProductsService.createProduct('123456', 'token123', productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Dados do produto são obrigatórios');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante criação na API', async () => {
            const error = new Error('Erro ao criar produto');
            const productData = { name: 'Produto Test' };

            NsApiClient.post.mockRejectedValue(error);

            const result = await NsProductsService.createProduct('123456', 'token123', productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao criar produto');
        });
    });

    describe('updateProduct - Atualizar produto', () => {
        test('deve atualizar produto com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productId = '1';
            const productData = {
                name: 'Produto Atualizado',
                price: '59.99'
            };
            const mockUpdatedProduct = {
                id: 1,
                ...productData
            };

            NsApiClient.put.mockResolvedValue(mockUpdatedProduct);

            const result = await NsProductsService.updateProduct(storeId, accessToken, productId, productData);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockUpdatedProduct);
            expect(NsApiClient.put).toHaveBeenCalledWith({
                storeId,
                endpoint: `products/${productId}`,
                accessToken,
                data: productData
            });
        });

        test('deve retornar erro quando productId não fornecido', async () => {
            const productData = { name: 'Produto Test' };

            const result = await NsProductsService.updateProduct('123456', 'token123', null, productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do produto é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando dados do produto não fornecidos', async () => {
            const result = await NsProductsService.updateProduct('123456', 'token123', '1', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Dados do produto são obrigatórios');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante atualização na API', async () => {
            const error = new Error('Erro ao atualizar produto');
            const productData = { name: 'Produto Test' };

            NsApiClient.put.mockRejectedValue(error);

            const result = await NsProductsService.updateProduct('123456', 'token123', '1', productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao atualizar produto');
        });
    });

    describe('deleteProduct - Excluir produto', () => {
        test('deve excluir produto com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productId = '1';

            NsApiClient.delete.mockResolvedValue();

            const result = await NsProductsService.deleteProduct(storeId, accessToken, productId);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Produto excluído com sucesso');
            expect(NsApiClient.delete).toHaveBeenCalledWith({
                storeId,
                endpoint: `products/${productId}`,
                accessToken
            });
        });

        test('deve retornar erro quando productId não fornecido', async () => {
            const result = await NsProductsService.deleteProduct('123456', 'token123', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do produto é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante exclusão na API', async () => {
            const error = new Error('Erro ao excluir produto');

            NsApiClient.delete.mockRejectedValue(error);

            const result = await NsProductsService.deleteProduct('123456', 'token123', '1');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao excluir produto');
        });
    });

    describe('getProductVariants - Buscar variantes do produto', () => {
        test('deve buscar variantes do produto com sucesso', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productId = '1';
            const mockVariants = [
                {
                    id: 1,
                    product_id: 1,
                    name: 'Tamanho P',
                    price: '29.99'
                },
                {
                    id: 2,
                    product_id: 1,
                    name: 'Tamanho M',
                    price: '29.99'
                }
            ];

            NsApiClient.get.mockResolvedValue(mockVariants);

            const result = await NsProductsService.getProductVariants(storeId, accessToken, productId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockVariants);
            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId,
                endpoint: `products/${productId}/variants`,
                accessToken
            });
        });

        test('deve retornar erro quando productId não fornecido', async () => {
            const result = await NsProductsService.getProductVariants('123456', 'token123', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do produto é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve tratar erro durante busca de variantes na API', async () => {
            const error = new Error('Erro ao buscar variantes');

            NsApiClient.get.mockRejectedValue(error);

            const result = await NsProductsService.getProductVariants('123456', 'token123', '1');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao buscar variantes');
        });
    });

    describe('syncProduct - Sincronizar produto com Nuvemshop', () => {
        const mockProduct = {
            id: 1,
            name: 'Produto Teste',
            description: 'Descrição do produto',
            price: 29.99,
            sku: 'SKU123',
            stock: 10,
            tags: 'teste,produto',
            categories: [1, 2],
            images: ['image1.jpg', 'image2.jpg']
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('deve sincronizar produto criando novo quando não existe', async () => {
            const storeId = '123456';
            const accessToken = 'token123';

            // Mock busca produto existente (não encontra)
            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: [] // Nenhum produto encontrado
            });

            // Mock criação do produto
            NsProductsService.createProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100, name: 'Produto Teste' }
            });

            // Mock update para external_id
            NsProductsService.updateProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100 }
            });

            const result = await NsProductsService.syncProduct(storeId, accessToken, mockProduct);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Produto criado com sucesso na Nuvemshop');
            expect(result.nuvemshop_id).toBe(100);
            expect(NsProductsService.createProduct).toHaveBeenCalledWith(
                storeId,
                accessToken,
                expect.objectContaining({
                    name: { pt: 'Produto Teste' },
                    description: { pt: 'Descrição do produto' },
                    published: true,
                    variants: expect.arrayContaining([
                        expect.objectContaining({
                            price: '29.99',
                            sku: 'SKU123',
                            stock: 10
                        })
                    ])
                })
            );
        });

        test('deve sincronizar produto atualizando quando já existe', async () => {
            const storeId = '123456';
            const accessToken = 'token123';

            // Mock busca produto existente (encontra)
            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: [{ id: 100, external_id: '1' }] // Produto existente
            });

            // Mock atualização do produto
            NsProductsService.updateProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100, name: 'Produto Teste' }
            });

            const result = await NsProductsService.syncProduct(storeId, accessToken, mockProduct);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Produto atualizado com sucesso na Nuvemshop');
            expect(result.nuvemshop_id).toBe(100);
            expect(NsProductsService.updateProduct).toHaveBeenCalledWith(
                storeId,
                accessToken,
                100,
                expect.objectContaining({
                    name: { pt: 'Produto Teste' },
                    description: { pt: 'Descrição do produto' },
                    variants: expect.arrayContaining([
                        expect.objectContaining({
                            price: '29.99',
                            sku: 'SKU123',
                            stock: 10
                        })
                    ])
                })
            );
        });

        test('deve retornar erro quando storeId não fornecido', async () => {
            const result = await NsProductsService.syncProduct('', 'token123', mockProduct);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID da loja é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando accessToken não fornecido', async () => {
            const result = await NsProductsService.syncProduct('123456', '', mockProduct);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Token de acesso é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve lidar com categories em formato string JSON', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productWithStringCategories = {
                ...mockProduct,
                categories: '["1", "2"]' // String JSON
            };

            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: []
            });

            NsProductsService.createProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100 }
            });

            await NsProductsService.syncProduct(storeId, accessToken, productWithStringCategories);

            expect(NsProductsService.createProduct).toHaveBeenCalledWith(
                storeId,
                accessToken,
                expect.objectContaining({
                    categories: [1, 2] // Convertido para array de números
                })
            );
        });

        test('deve lidar com images em formato string JSON', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productWithStringImages = {
                ...mockProduct,
                images: '["image1.jpg", "image2.jpg"]' // String JSON
            };

            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: []
            });

            NsProductsService.createProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100 }
            });

            await NsProductsService.syncProduct(storeId, accessToken, productWithStringImages);

            // Como images não vai para createProduct, apenas verificamos que não deu erro
            expect(NsProductsService.createProduct).toHaveBeenCalled();
        });

        test('deve lidar com categories inválidas', async () => {
            const storeId = '123456';
            const accessToken = 'token123';
            const productWithInvalidCategories = {
                ...mockProduct,
                categories: 'string_invalida' // String inválida
            };

            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: []
            });

            NsProductsService.createProduct = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 100 }
            });

            await NsProductsService.syncProduct(storeId, accessToken, productWithInvalidCategories);

            // Deve criar produto sem categories
            expect(NsProductsService.createProduct).toHaveBeenCalledWith(
                storeId,
                accessToken,
                expect.not.objectContaining({
                    categories: expect.anything()
                })
            );
        });

        test('deve tratar erro na busca de produtos existentes', async () => {
            const storeId = '123456';
            const accessToken = 'token123';

            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: false,
                message: 'Erro na busca'
            });

            const result = await NsProductsService.syncProduct(storeId, accessToken, mockProduct);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro na busca');
        });

        test('deve tratar erro de validação da Nuvemshop (422)', async () => {
            const storeId = '123456';
            const accessToken = 'token123';

            NsProductsService.getProducts = jest.fn().mockResolvedValue({
                success: true,
                data: []
            });

            const nsValidationError = new Error('Validation Error');
            nsValidationError.nsError = {
                originalError: {
                    name: ['é obrigatório'],
                    price: ['deve ser um número']
                }
            };

            NsProductsService.createProduct = jest.fn().mockRejectedValue(nsValidationError);

            const result = await NsProductsService.syncProduct(storeId, accessToken, mockProduct);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de validação na Nuvemshop');
            expect(result.status).toBe(422);
            expect(result.errors).toEqual([
                'name: é obrigatório',
                'price: deve ser um número'
            ]);
        });

        test('deve tratar erro genérico durante sincronização', async () => {
            const storeId = '123456';
            const accessToken = 'token123';

            NsProductsService.getProducts = jest.fn().mockRejectedValue(new Error('Erro de conexão'));

            const result = await NsProductsService.syncProduct(storeId, accessToken, mockProduct);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Erro de conexão');
        });
    });
});
