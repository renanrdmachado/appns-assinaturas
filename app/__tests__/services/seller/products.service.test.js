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

// Mock do subscription validator
jest.mock('../../../utils/subscription-validator', () => ({
    checkSubscriptionMiddleware: jest.fn(() => Promise.resolve({ success: true }))
}));

// Agora importamos os módulos que serão usados
const SellerProductsService = require('../../../services/seller/products.service');
const NsApiClient = require('../../../helpers/NsApiClient');
const { formatError, createError } = require('../../../utils/errorHandler');
const { checkSubscriptionMiddleware } = require('../../../utils/subscription-validator');

describe('SellerProductsService - Testes', () => {
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
            message: error.message || 'Erro interno do servidor',
            code: 500
        }));
        createError.mockImplementation((message, code) => ({
            success: false,
            message,
            code
        }));

        // Mock padrão para subscription validator (assinatura válida)
        checkSubscriptionMiddleware.mockResolvedValue({ success: true });
    });


    describe('getProducts - Listar produtos', () => {
        it('deve listar produtos com sucesso', async () => {
            const mockProducts = [
                { id: 1, name: 'Produto 1' },
                { id: 2, name: 'Produto 2' }
            ];

            NsApiClient.get.mockResolvedValue(mockProducts);

            const result = await SellerProductsService.getProducts('1', '123456', 'token123');

            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products',
                accessToken: 'token123',
                params: expect.any(URLSearchParams)
            });
            expect(result).toEqual({
                success: true,
                data: mockProducts
            });
        });

        it('deve retornar erro quando storeId é inválido', async () => {
            const result = await SellerProductsService.getProducts('1', '', 'token123');

            expect(createError).toHaveBeenCalledWith('ID da loja é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'ID da loja é obrigatório',
                code: 400
            });
        });

        it('deve retornar erro quando accessToken é inválido', async () => {
            const result = await SellerProductsService.getProducts('1', '123456', '');

            expect(createError).toHaveBeenCalledWith('Token de acesso é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'Token de acesso é obrigatório',
                code: 400
            });
        });

        it('deve tratar erro da API', async () => {
            const mockError = new Error('Erro de API');
            NsApiClient.get.mockRejectedValue(mockError);

            const result = await SellerProductsService.getProducts('1', '123456', 'token123');

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Erro de API',
                code: 500
            });
        });
    });

    describe('getProductById - Buscar produto por ID', () => {
        it('deve buscar produto por ID com sucesso', async () => {
            const mockProduct = { id: 1, name: 'Produto 1' };
            NsApiClient.get.mockResolvedValue(mockProduct);

            const result = await SellerProductsService.getProductById('1', '123456', 'token123', '1');

            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products/1',
                accessToken: 'token123'
            });
            expect(result).toEqual({
                success: true,
                data: mockProduct
            });
        });

        it('deve retornar erro quando productId não é fornecido', async () => {
            const result = await SellerProductsService.getProductById('1', '123456', 'token123', null);

            expect(createError).toHaveBeenCalledWith('ID do produto é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'ID do produto é obrigatório',
                code: 400
            });
        });

        it('deve tratar erro quando produto não é encontrado', async () => {
            const mockError = new Error('Produto não encontrado');
            NsApiClient.get.mockRejectedValue(mockError);

            const result = await SellerProductsService.getProductById('1', '123456', 'token123', '999');

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Produto não encontrado',
                code: 500
            });
        });
    });

    describe('createProduct - Criar produto', () => {
        it('deve criar produto com sucesso', async () => {
            const productData = { name: 'Novo Produto', price: '29.99' };
            const mockProduct = { id: 100, ...productData };
            NsApiClient.post.mockResolvedValue(mockProduct);

            const result = await SellerProductsService.createProduct('1', '123456', 'token123', productData);

            expect(NsApiClient.post).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products',
                accessToken: 'token123',
                data: productData
            });
            expect(result).toEqual({
                success: true,
                data: mockProduct
            });
        });

        it('deve retornar erro quando dados do produto são inválidos', async () => {
            const result = await SellerProductsService.createProduct('1', '123456', 'token123', null);

            expect(createError).toHaveBeenCalledWith('Dados do produto são obrigatórios', 400);
            expect(result).toEqual({
                success: false,
                message: 'Dados do produto são obrigatórios',
                code: 400
            });
        });

        it('deve retornar erro quando nome do produto não é fornecido', async () => {
            const productData = { price: '29.99' }; // sem name
            const result = await SellerProductsService.createProduct('1', '123456', 'token123', productData);

            expect(createError).toHaveBeenCalledWith('Dados do produto são obrigatórios', 400);
            expect(result).toEqual({
                success: false,
                message: 'Dados do produto são obrigatórios',
                code: 400
            });
        });

        it('deve tratar erro ao criar produto', async () => {
            const productData = { name: 'Novo Produto', price: '29.99' };
            const mockError = new Error('Erro ao criar produto');
            NsApiClient.post.mockRejectedValue(mockError);

            const result = await SellerProductsService.createProduct('1', '123456', 'token123', productData);

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Erro ao criar produto',
                code: 500
            });
        });
    });

    describe('updateProduct - Atualizar produto', () => {
        it('deve atualizar produto com sucesso', async () => {
            const productData = { name: 'Produto Atualizado', price: '39.99' };
            const mockProduct = { id: 1, ...productData };
            NsApiClient.put.mockResolvedValue(mockProduct);

            const result = await SellerProductsService.updateProduct('1', '123456', 'token123', '1', productData);

            expect(NsApiClient.put).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products/1',
                accessToken: 'token123',
                data: productData
            });
            expect(result).toEqual({
                success: true,
                data: mockProduct
            });
        });

        it('deve retornar erro quando productId não é fornecido', async () => {
            const productData = { name: 'Produto Atualizado' };
            const result = await SellerProductsService.updateProduct('1', '123456', 'token123', null, productData);

            expect(createError).toHaveBeenCalledWith('ID do produto é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'ID do produto é obrigatório',
                code: 400
            });
        });

        it('deve retornar erro quando dados do produto não são fornecidos', async () => {
            const result = await SellerProductsService.updateProduct('1', '123456', 'token123', '1', null);

            expect(createError).toHaveBeenCalledWith('Dados do produto são obrigatórios', 400);
            expect(result).toEqual({
                success: false,
                message: 'Dados do produto são obrigatórios',
                code: 400
            });
        });

        it('deve tratar erro ao atualizar produto', async () => {
            const productData = { name: 'Produto Atualizado' };
            const mockError = new Error('Erro ao atualizar produto');
            NsApiClient.put.mockRejectedValue(mockError);

            const result = await SellerProductsService.updateProduct('1', '123456', 'token123', '1', productData);

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Erro ao atualizar produto',
                code: 500
            });
        });
    });

    describe('deleteProduct - Excluir produto', () => {
        it('deve excluir produto com sucesso', async () => {
            NsApiClient.delete.mockResolvedValue();

            const result = await SellerProductsService.deleteProduct('1', '123456', 'token123', '1');

            expect(NsApiClient.delete).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products/1',
                accessToken: 'token123'
            });
            expect(result).toEqual({
                success: true,
                message: 'Produto excluído com sucesso'
            });
        });

        it('deve retornar erro quando productId não é fornecido', async () => {
            const result = await SellerProductsService.deleteProduct('1', '123456', 'token123', null);

            expect(createError).toHaveBeenCalledWith('ID do produto é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'ID do produto é obrigatório',
                code: 400
            });
        });

        it('deve tratar erro ao excluir produto', async () => {
            const mockError = new Error('Erro ao excluir produto');
            NsApiClient.delete.mockRejectedValue(mockError);

            const result = await SellerProductsService.deleteProduct('1', '123456', 'token123', '1');

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Erro ao excluir produto',
                code: 500
            });
        });
    });

    describe('getProductVariants - Obter variantes do produto', () => {
        it('deve obter variantes com sucesso', async () => {
            const mockVariants = [
                { id: 1, sku: 'VAR-001', price: '29.99' },
                { id: 2, sku: 'VAR-002', price: '34.99' }
            ];
            NsApiClient.get.mockResolvedValue(mockVariants);

            const result = await SellerProductsService.getProductVariants('1', '123456', 'token123', '1');

            expect(NsApiClient.get).toHaveBeenCalledWith({
                storeId: '123456',
                endpoint: 'products/1/variants',
                accessToken: 'token123'
            });
            expect(result).toEqual({
                success: true,
                data: mockVariants
            });
        });

        it('deve retornar erro quando productId não é fornecido', async () => {
            const result = await SellerProductsService.getProductVariants('1', '123456', 'token123', null);

            expect(createError).toHaveBeenCalledWith('ID do produto é obrigatório', 400);
            expect(result).toEqual({
                success: false,
                message: 'ID do produto é obrigatório',
                code: 400
            });
        });

        it('deve tratar erro ao buscar variantes', async () => {
            const mockError = new Error('Erro ao buscar variantes');
            NsApiClient.get.mockRejectedValue(mockError);

            const result = await SellerProductsService.getProductVariants('1', '123456', 'token123', '1');

            expect(formatError).toHaveBeenCalledWith(mockError);
            expect(result).toEqual({
                success: false,
                message: 'Erro ao buscar variantes',
                code: 500
            });
        });
    });
});
