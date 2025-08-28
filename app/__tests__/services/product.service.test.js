// Mock dos módulos do banco de dados ANTES de importar qualquer coisa
jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({})
}));

// Mock dos modelos
jest.mock('../../models/Product', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  update: jest.fn(),
  belongsTo: jest.fn(),
  prototype: {
    get: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    toJSON: jest.fn()
  }
}));

jest.mock('../../models/Seller', () => {
    function Seller() {}
    Seller.findByPk = jest.fn();
    Seller.findAll = jest.fn();
    Seller.findOne = jest.fn();
    Seller.create = jest.fn();
    Seller.destroy = jest.fn();
    Seller.update = jest.fn();
    Seller.belongsTo = jest.fn();
    return Seller;
});

// Mock do SellerService
jest.mock('../../services/seller.service', () => ({
  get: jest.fn()
}));

// Mock do formatError helper
jest.mock('../../utils/errorHandler', () => ({
  formatError: jest.fn((error) => ({
    success: false,
    message: error.message || 'Erro de validação',
    code: error.status || 500
  })),
  createError: jest.fn((message, code) => ({
    success: false,
    message,
    code
  }))
}));

const Product = require('../../models/Product');
const SellerService = require('../../services/seller.service');
const ProductService = require('../../services/product.service');

describe('ProductService - Testes de Integração', () => {
    let productService;

    beforeEach(() => {
        jest.clearAllMocks();
        productService = ProductService; // É um singleton, não precisa de new
    });

    describe('get - Buscar produto por ID', () => {
        test('deve buscar um produto pelo ID com sucesso', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Teste',
                price: 25.99,
                subscription_price: 22.99,
                stock: 10,
                sku: 'SKU123',
                description: 'Descrição do produto teste',
                categories: null,
                images: null,
                tags: 'teste,produto',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            Product.findOne.mockResolvedValue(mockProduct);

            const result = await productService.get(1);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProduct);
            expect(Product.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        test('deve retornar erro quando produto não encontrado', async () => {
            Product.findOne.mockResolvedValue(null);

            const result = await productService.get(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Produto com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID não fornecido', async () => {
            const result = await productService.get(null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('getAll - Listar produtos', () => {
        test('deve listar todos os produtos com sucesso', async () => {
            const mockProducts = [
                { id: 1, name: 'Produto 1', seller_id: 1 },
                { id: 2, name: 'Produto 2', seller_id: 1 }
            ];

            Product.findAll.mockResolvedValue(mockProducts);

            const result = await productService.getAll();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProducts);
            expect(Product.findAll).toHaveBeenCalledWith({ where: {} });
        });

        test('deve listar produtos filtrados por seller_id', async () => {
            const mockProducts = [
                { id: 1, name: 'Produto 1', seller_id: 1 }
            ];

            Product.findAll.mockResolvedValue(mockProducts);

            const result = await productService.getAll(1);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockProducts);
            expect(Product.findAll).toHaveBeenCalledWith({ where: { seller_id: 1 } });
        });

        test('deve retornar lista vazia quando não há produtos', async () => {
            Product.findAll.mockResolvedValue([]);

            const result = await productService.getAll();

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });

    describe('create - Criar produto', () => {
        test('deve criar produto com sucesso', async () => {
            const productData = {
                seller_id: 1,
                name: 'Novo Produto',
                price: 29.99,
                subscription_price: 25.99,
                stock: 15,
                sku: 'NEW123',
                description: 'Novo produto para teste',
                categories: ['1', '2'],
                images: ['image1.jpg', 'image2.jpg'],
                tags: 'novo,produto'
            };

            const mockCreatedProduct = {
                id: 1,
                ...productData,
                toJSON: jest.fn().mockReturnValue({ id: 1, ...productData })
            };

            Product.create.mockResolvedValue(mockCreatedProduct);

            const result = await productService.create(productData);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 1, ...productData });
            expect(Product.create).toHaveBeenCalledWith({
                seller_id: 1,
                name: 'Novo Produto',
                price: 29.99,
                subscription_price: 25.99,
                stock: 15,
                sku: 'NEW123',
                description: 'Novo produto para teste',
                categories: ['1', '2'],
                images: ['image1.jpg', 'image2.jpg'],
                tags: 'novo,produto'
            });
        });

        test('deve retornar erro quando nome não fornecido', async () => {
            const productData = {
                seller_id: 1,
                price: 29.99
            };

            const result = await productService.create(productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Nome do produto é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando preço inválido', async () => {
            const productData = {
                seller_id: 1,
                name: 'Produto Teste',
                price: 'invalid'
            };

            const result = await productService.create(productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Preço deve ser um valor numérico válido');
            expect(result.code).toBe(400);
        });

        test('deve validar subscription_price quando fornecido', async () => {
            const productData = {
                seller_id: 1,
                name: 'Produto Teste',
                price: 29.99,
                subscription_price: 'invalid'
            };

            const result = await productService.create(productData);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Preço de assinatura deve ser um valor numérico válido');
            expect(result.code).toBe(400);
        });
    });

    describe('update - Atualizar produto', () => {
        test('deve atualizar produto com sucesso', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Original',
                price: 25.99,
                update: jest.fn().mockResolvedValue(),
                toJSON: jest.fn().mockReturnValue({
                    id: 1,
                    seller_id: 1,
                    name: 'Produto Atualizado',
                    price: 30.99
                })
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const updateData = {
                name: 'Produto Atualizado',
                price: 30.99
            };

            const result = await productService.update(1, updateData);

            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Produto Atualizado');
            expect(result.data.price).toBe(30.99);
            expect(mockProduct.update).toHaveBeenCalled();
        });

        test('deve retornar erro quando produto não encontrado para atualização', async () => {
            Product.findByPk.mockResolvedValue(null);

            const result = await productService.update(999, { name: 'Updated Product' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Produto com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID não fornecido no update', async () => {
            const result = await productService.update(null, { name: 'Updated Product' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando preço inválido no update', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Original',
                price: 25.99
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const result = await productService.update(1, { price: 'invalid' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Preço deve ser um valor numérico válido');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando subscription_price inválido no update', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Original',
                price: 25.99
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const result = await productService.update(1, { subscription_price: 'invalid' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Preço de assinatura deve ser um valor numérico válido');
            expect(result.code).toBe(400);
        });
    });

    describe('delete - Excluir produto', () => {
        test('deve excluir produto com sucesso', async () => {
            const mockProduct = {
                id: 1,
                name: 'Produto para excluir',
                destroy: jest.fn().mockResolvedValue()
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const result = await productService.delete(1);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Produto com ID 1 foi excluído com sucesso');
            expect(mockProduct.destroy).toHaveBeenCalled();
        });

        test('deve retornar erro quando produto não encontrado para exclusão', async () => {
            Product.findByPk.mockResolvedValue(null);

            const result = await productService.delete(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Produto com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID não fornecido no delete', async () => {
            const result = await productService.delete(null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('getSellerByProductId - Buscar seller por produto', () => {
        test('deve buscar seller pelo ID do produto com sucesso', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Teste'
            };

            const mockSeller = {
                id: 1,
                name: 'Seller Teste',
                email: 'seller@test.com'
            };

            Product.findOne.mockResolvedValue(mockProduct);
            SellerService.get.mockResolvedValue({
                success: true,
                data: mockSeller
            });

            const result = await productService.getSellerByProductId(1);

            expect(result.success).toBe(true);
            expect(result.data.product).toEqual({
                id: 1,
                name: 'Produto Teste',
                seller_id: 1
            });
            expect(result.data.seller).toEqual(mockSeller);
            expect(Product.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                attributes: ['id', 'name', 'seller_id']
            });
            expect(SellerService.get).toHaveBeenCalledWith(1);
        });

        test('deve retornar erro quando produto não encontrado', async () => {
            Product.findOne.mockResolvedValue(null);

            const result = await productService.getSellerByProductId(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Produto com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando seller não encontrado', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                name: 'Produto Teste'
            };

            Product.findOne.mockResolvedValue(mockProduct);
            SellerService.get.mockResolvedValue({
                success: false,
                message: 'Seller não encontrado',
                code: 404
            });

            const result = await productService.getSellerByProductId(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Seller 1 não encontrado para o produto 1');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID do produto não fornecido', async () => {
            const result = await productService.getSellerByProductId(null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do produto é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('Tratamento de erros', () => {
        test('deve tratar erros do banco de dados corretamente', async () => {
            const dbError = new Error('Erro de conexão com o banco');
            Product.findOne.mockRejectedValue(dbError);

            const result = await productService.get(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão com o banco');
        });

        test('deve tratar erros de validação na criação', async () => {
            const validationError = new Error('Erro de validação');
            Product.create.mockRejectedValue(validationError);

            const result = await productService.create({
                seller_id: 1,
                name: 'Produto Teste',
                price: 29.99
            });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de validação');
        });

        test('deve tratar casos onde getAll retorna array vazio', async () => {
            Product.findAll.mockResolvedValue([]);

            const result = await productService.getAll();

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(Array.isArray(result.data)).toBe(true);
        });

        test('deve tratar erro no getAll', async () => {
            const dbError = new Error('Erro no banco getAll');
            Product.findAll.mockRejectedValue(dbError);

            const result = await productService.getAll();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro no banco getAll');
        });

        test('deve tratar erro no update', async () => {
            const mockProduct = {
                id: 1,
                seller_id: 1,
                update: jest.fn().mockRejectedValue(new Error('Erro no update'))
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const result = await productService.update(1, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro no update');
        });

        test('deve tratar erro no delete', async () => {
            const mockProduct = {
                id: 1,
                destroy: jest.fn().mockRejectedValue(new Error('Erro no delete'))
            };

            Product.findByPk.mockResolvedValue(mockProduct);

            const result = await productService.delete(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro no delete');
        });

        test('deve tratar erro no getSellerByProductId', async () => {
            const dbError = new Error('Erro no getSellerByProductId');
            Product.findOne.mockRejectedValue(dbError);

            const result = await productService.getSellerByProductId(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro no getSellerByProductId');
        });
    });
});
