// Mock dos módulos do banco de dados ANTES de importar qualquer coisa
jest.mock('../../../config/database', () => ({
  transaction: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({})
}));

// Mock dos modelos antes de importar qualquer coisa
jest.mock('../../../models/Seller', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn(),
  hasMany: jest.fn()
}));

jest.mock('../../../models/Shopper', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../../models/Order', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../../models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn(),
  hasOne: jest.fn()
}));

jest.mock('../../../models/UserData', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  hasMany: jest.fn()
}));

jest.mock('../../../models/SellerSubscription', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  create: jest.fn()
}));

// Mock do error handler
jest.mock('../../../utils/errorHandler', () => ({
  formatError: jest.fn().mockImplementation((error) => ({
    success: false,
    message: error.message,
    status: 500
  })),
  createError: jest.fn().mockImplementation((message, status) => ({
    success: false,
    message,
    code: status
  }))
}));

// Mock do subscription validator
jest.mock('../../../utils/subscription-validator', () => ({
  checkSubscriptionMiddleware: jest.fn().mockResolvedValue(null) // Por padrão, retorna null (assinatura válida)
}));

// Agora importamos os módulos que serão usados
const SellerShoppersService = require('../../../services/seller/shoppers.service');
const subscriptionValidator = require('../../../utils/subscription-validator');
const Seller = require('../../../models/Seller');
const Shopper = require('../../../models/Shopper');
const Order = require('../../../models/Order');
const User = require('../../../models/User');
const UserData = require('../../../models/UserData');
const { formatError, createError } = require('../../../utils/errorHandler');

describe('SellerShoppersService - Testes', () => {
    // Silenciar console.error durante os testes
    let consoleErrorSpy;
    
    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterAll(() => {
        if (consoleErrorSpy) consoleErrorSpy.mockRestore();
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

    describe('getSellerShoppers - Listar shoppers do seller', () => {
        test('deve listar shoppers vinculados ao seller com sucesso', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [
                { shopper_id: 1 },
                { shopper_id: 2 },
                { shopper_id: 1 } // Duplicado para testar Set
            ];
            const mockShoppers = [
                {
                    id: 1,
                    name: 'Shopper 1',
                    email: 'shopper1@test.com',
                    user: {
                        id: 1,
                        email: 'shopper1@test.com',
                        userData: { id: 1, cpfCnpj: '12345678901' }
                    }
                },
                {
                    id: 2,
                    name: 'Shopper 2',
                    email: 'shopper2@test.com',
                    user: {
                        id: 2,
                        email: 'shopper2@test.com',
                        userData: { id: 2, cpfCnpj: '10987654321' }
                    }
                }
            ];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue(mockShoppers);
            Shopper.count.mockResolvedValue(2);

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockShoppers);
            expect(result.pagination.total).toBe(2);
            expect(Seller.findByPk).toHaveBeenCalledWith(sellerId);
            expect(Order.findAll).toHaveBeenCalledWith({
                where: { seller_id: sellerId },
                attributes: ['shopper_id'],
                raw: true
            });
        });

        test('deve retornar array vazio quando seller não tem clientes', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue([]); // Sem pedidos

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.message).toBe('Este vendedor não possui clientes');
        });

        test('deve retornar erro quando sellerId não fornecido', async () => {
            const result = await SellerShoppersService.getSellerShoppers();

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do vendedor é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando seller não encontrado', async () => {
            const sellerId = '999';

            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(false);
            expect(result.message).toBe(`Vendedor com ID ${sellerId} não encontrado`);
            expect(result.code).toBe(404);
        });

        test('deve aplicar filtros de busca quando fornecidos', async () => {
            const sellerId = '1';
            const params = { name: 'Test', email: 'test@', limit: 10, offset: 0 };
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId, params);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Verifica se os filtros foram aplicados
            expect(calls.where.id).toBeDefined();
            expect(calls.where.name).toBeDefined();
            expect(calls.where.email).toBeDefined();
            expect(calls.limit).toBe(10);
            expect(calls.offset).toBe(0);
            expect(calls.order).toEqual([['createdAt', 'DESC']]);
        });

        test('deve aplicar valores padrão de paginação quando não fornecidos', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Verifica valores padrão
            expect(calls.limit).toBe(50);
            expect(calls.offset).toBe(0);
        });

        test('deve remover IDs duplicados de shoppers dos pedidos', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [
                { shopper_id: 1 },
                { shopper_id: 2 },
                { shopper_id: 1 }, // Duplicado
                { shopper_id: 3 },
                { shopper_id: 2 }  // Duplicado
            ];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Verifica se apenas IDs únicos foram usados no operador IN
            const whereCondition = calls.where.id;
            expect(whereCondition).toBeDefined();
            expect(Object.getOwnPropertySymbols(whereCondition)).toHaveLength(1);
            const inSymbol = Object.getOwnPropertySymbols(whereCondition)[0];
            const uniqueIds = whereCondition[inSymbol];
            expect(uniqueIds).toEqual(expect.arrayContaining([1, 2, 3]));
            expect(uniqueIds).toHaveLength(3);
        });

        test('deve incluir relacionamentos User e UserData na busca', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Verifica includes
            expect(calls.include).toHaveLength(1);
            expect(calls.include[0].model).toBe(User);
            expect(calls.include[0].as).toBe('user');
            expect(calls.include[0].include).toHaveLength(1);
            expect(calls.include[0].include[0].model).toBe(UserData);
            expect(calls.include[0].include[0].as).toBe('userData');
        });

        test('deve retornar informações de paginação corretas', async () => {
            const sellerId = '1';
            const params = { limit: 5, offset: 10 };
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];
            const mockShoppers = [{ id: 1, name: 'Shopper 1' }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue(mockShoppers);
            Shopper.count.mockResolvedValue(25);

            const result = await SellerShoppersService.getSellerShoppers(sellerId, params);

            expect(result.success).toBe(true);
            expect(result.pagination).toEqual({
                total: 25,
                limit: 5,
                offset: 10
            });
        });

        test('deve tratar erro durante execução', async () => {
            const sellerId = '1';
            const error = new Error('Erro de conexão');

            Seller.findByPk.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
            expect(formatError).toHaveBeenCalledWith(error);
        });

        test('deve tratar erro durante busca de pedidos', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const error = new Error('Erro na busca de pedidos');

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro na busca de pedidos');
        });

        test('deve tratar erro durante busca de shoppers', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];
            const error = new Error('Erro na busca de shoppers');

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro na busca de shoppers');
        });

        test('deve validar tipos de parâmetros de paginação', async () => {
            const sellerId = '1';
            const params = { limit: '15', offset: '20' }; // Strings que devem ser convertidas
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId, params);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Verifica se foram convertidos para números
            expect(calls.limit).toBe(15);
            expect(calls.offset).toBe(20);
        });
    });

    describe('getSellerShopperById - Buscar shopper específico do seller', () => {
        test('deve buscar shopper específico vinculado ao seller com sucesso', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrder = { id: 1, seller_id: 1, shopper_id: 2 };
            const mockShopper = {
                id: 2,
                name: 'Shopper Test',
                email: 'shopper@test.com',
                user: {
                    id: 2,
                    email: 'shopper@test.com',
                    userData: { id: 2, cpfCnpj: '12345678901' }
                }
            };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(mockOrder);
            Shopper.findByPk.mockResolvedValue(mockShopper);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockShopper);
            expect(Seller.findByPk).toHaveBeenCalledWith(sellerId);
            expect(Order.findOne).toHaveBeenCalledWith({
                where: {
                    seller_id: sellerId,
                    shopper_id: shopperId
                }
            });
            expect(Shopper.findByPk).toHaveBeenCalledWith(shopperId, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }]
                    }
                ]
            });
        });

        test('deve retornar erro quando sellerId não fornecido', async () => {
            const result = await SellerShoppersService.getSellerShopperById(null, '2');

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do vendedor é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando shopperId não fornecido', async () => {
            const result = await SellerShoppersService.getSellerShopperById('1', null);

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do cliente é obrigatório');
            expect(result.code).toBe(400);
        });

        test('deve retornar erro quando seller não encontrado', async () => {
            const sellerId = '999';
            const shopperId = '2';

            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe(`Vendedor com ID ${sellerId} não encontrado`);
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando shopper não está vinculado ao seller', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(null); // Sem conexão

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe(`Cliente com ID ${shopperId} não está vinculado a este vendedor`);
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando shopper não encontrado', async () => {
            const sellerId = '1';
            const shopperId = '999';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrder = { id: 1, seller_id: 1, shopper_id: 999 };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(mockOrder);
            Shopper.findByPk.mockResolvedValue(null);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe(`Cliente com ID ${shopperId} não encontrado`);
            expect(result.code).toBe(404);
        });

        test('deve tratar erro durante execução', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const error = new Error('Erro de conexão');

            Seller.findByPk.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
            expect(formatError).toHaveBeenCalledWith(error);
        });

        test('deve tratar erro durante busca de pedidos na verificação de vínculo', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const error = new Error('Erro na busca de pedidos');

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro na busca de pedidos');
        });

        test('deve tratar erro durante busca do shopper', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrder = { id: 1, seller_id: 1, shopper_id: 2 };
            const error = new Error('Erro na busca do shopper');

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(mockOrder);
            Shopper.findByPk.mockRejectedValue(error);

            const result = await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro na busca do shopper');
        });

        test('deve incluir relacionamentos User e UserData na busca por ID', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrder = { id: 1, seller_id: 1, shopper_id: 2 };
            const mockShopper = { id: 2, name: 'Shopper Test' };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(mockOrder);
            Shopper.findByPk.mockResolvedValue(mockShopper);

            await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(Shopper.findByPk).toHaveBeenCalledWith(shopperId, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }]
                    }
                ]
            });
        });

        test('deve validar IDs com tipos string vazios', async () => {
            // Teste sellerId vazio
            let result = await SellerShoppersService.getSellerShopperById('', '2');
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do vendedor é obrigatório');

            // Teste shopperId vazio
            result = await SellerShoppersService.getSellerShopperById('1', '');
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do cliente é obrigatório');
        });

        test('deve validar IDs com tipos undefined', async () => {
            // Teste sellerId undefined
            let result = await SellerShoppersService.getSellerShopperById(undefined, '2');
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do vendedor é obrigatório');

            // Teste shopperId undefined
            result = await SellerShoppersService.getSellerShopperById('1', undefined);
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID do cliente é obrigatório');
        });
    });

    describe('Testes de Edge Cases e Validações Extras', () => {
        test('getSellerShoppers - deve lidar com sellerId com espaços em branco', async () => {
            const mockSeller = { id: 1, name: 'Seller Test' };
            
            // Como o service atual não faz trim, '   ' é considerado um ID válido
            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue([]);

            const result = await SellerShoppersService.getSellerShoppers('   ');

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.message).toBe('Este vendedor não possui clientes');
            expect(Seller.findByPk).toHaveBeenCalledWith('   ');
        });

        test('getSellerShoppers - deve lidar com parâmetros de filtro vazios', async () => {
            const sellerId = '1';
            const params = { name: '', email: '', limit: '', offset: '' };
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId, params);

            const calls = Shopper.findAll.mock.calls[0][0];
            
            // Não deve incluir filtros vazios
            expect(calls.where.name).toBeUndefined();
            expect(calls.where.email).toBeUndefined();
            // Deve usar valores padrão para paginação
            expect(calls.limit).toBe(50);
            expect(calls.offset).toBe(0);
        });

        test('getSellerShoppers - deve lidar com Order.findAll retornando array vazio', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue([]); // Sem pedidos

            const result = await SellerShoppersService.getSellerShoppers(sellerId);

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(result.message).toBe('Este vendedor não possui clientes');
            // Não deve tentar buscar shoppers se não há pedidos
            expect(Shopper.findAll).not.toHaveBeenCalled();
        });

        test('getSellerShopperById - deve verificar Order.findOne com parâmetros corretos', async () => {
            const sellerId = '1';
            const shopperId = '2';
            const mockSeller = { id: 1, name: 'Seller Test' };

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findOne.mockResolvedValue(null);

            await SellerShoppersService.getSellerShopperById(sellerId, shopperId);

            expect(Order.findOne).toHaveBeenCalledWith({
                where: {
                    seller_id: sellerId,
                    shopper_id: shopperId
                }
            });
        });

        test('getSellerShoppers - deve usar operador IN com shopperIds únicos', async () => {
            const sellerId = '1';
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [
                { shopper_id: 1 },
                { shopper_id: 2 },
                { shopper_id: 1 } // Duplicado
            ];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(0);

            await SellerShoppersService.getSellerShoppers(sellerId);

            expect(Order.findAll).toHaveBeenCalledWith({
                where: { seller_id: sellerId },
                attributes: ['shopper_id'],
                raw: true
            });
        });

        test('getSellerShoppers - deve chamar Shopper.count com whereConditions corretas', async () => {
            const sellerId = '1';
            const params = { name: 'Test Shopper' };
            const mockSeller = { id: 1, name: 'Seller Test' };
            const mockOrders = [{ shopper_id: 1 }];

            Seller.findByPk.mockResolvedValue(mockSeller);
            Order.findAll.mockResolvedValue(mockOrders);
            Shopper.findAll.mockResolvedValue([]);
            Shopper.count.mockResolvedValue(1);

            await SellerShoppersService.getSellerShoppers(sellerId, params);

            const countCall = Shopper.count.mock.calls[0][0];
            expect(countCall.where.id).toBeDefined();
            expect(countCall.where.name).toBeDefined();
        });
    });
});
