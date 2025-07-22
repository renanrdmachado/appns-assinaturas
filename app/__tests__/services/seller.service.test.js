// Precisamos fazer mock dos modelos e conexão com o banco ANTES de importar o serviço
// para evitar que as associações dos modelos sejam executadas

// Mock dos módulos do banco de dados
jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({})
}));

// Mock dos validators
jest.mock('../../validators/seller-validator', () => ({
  validateId: jest.fn(),
  validateSellerData: jest.fn(),
  validateSellerUpdateData: jest.fn(),
  validateNuvemshopId: jest.fn()
}));

jest.mock('../../validators/payment-methods-validator', () => ({
  validatePaymentMethods: jest.fn()
}));

// Mock dos services externos
jest.mock('../../services/asaas/customer.service', () => ({
  findByCpfCnpj: jest.fn(),
  createOrUpdate: jest.fn(),
  SELLER_GROUP: 'SELLER'
}));

jest.mock('../../utils/asaas-mapper', () => ({
  mapSellerToCustomer: jest.fn(),
  mapRawDataToCustomer: jest.fn()
}));

// Mock dos modelos antes de importar qualquer coisa que use os modelos
jest.mock('../../models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn(),
  hasOne: jest.fn(),
  hasMany: jest.fn()
}));

jest.mock('../../models/UserData', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  hasMany: jest.fn()
}));

jest.mock('../../models/Seller', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../models/Shopper', () => ({
  findOne: jest.fn(),
  count: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../models/SellerSubscription', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn()
}));

// Apenas fazemos mock do que é externo ao nosso serviço principal
jest.mock('../../services/asaas/customer.service', () => ({
  findByCpfCnpj: jest.fn().mockResolvedValue({ success: false }),
  createOrUpdate: jest.fn().mockResolvedValue({ success: true, data: { id: 'asaas123' } }),
  SELLER_GROUP: 'SELLERS'
}));

// Mock apenas do validador para garantir que sempre passa
jest.mock('../../validators/seller-validator', () => ({
  validateSellerData: jest.fn().mockReturnValue({ isValid: true }),
  validateId: jest.fn().mockReturnValue({ isValid: true }),
  validateNuvemshopId: jest.fn().mockReturnValue({ isValid: true }),
  validateSellerUpdateData: jest.fn().mockReturnValue({ isValid: true })
}));

// Mock para PaymentMethodsValidator
jest.mock('../../validators/payment-methods-validator', () => ({
  validatePaymentMethods: jest.fn().mockReturnValue(true),
  validateSinglePaymentMethod: jest.fn().mockReturnValue(true)
}));

jest.mock('../../utils/errorHandler', () => ({
  formatError: jest.fn(error => ({ success: false, message: error.message })),
  createError: jest.fn((message, code) => ({ success: false, message, code }))
}));

// Mock para AsaasMapper
jest.mock('../../utils/asaas-mapper', () => ({
  mapRawDataToCustomer: jest.fn().mockReturnValue({
    name: 'Seller Test',
    cpfCnpj: '12345678901',
    email: 'seller@example.com'
  })
}));

// Mock do subscription validator
jest.mock('../../utils/subscription-validator', () => ({
  checkSubscriptionMiddleware: jest.fn().mockResolvedValue(null), // Por padrão, assinatura válida
  validateSellerSubscription: jest.fn().mockResolvedValue({ success: true })
}));

// Agora importamos os módulos que serão usados
const SellerService = require('../../services/seller.service');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const Seller = require('../../models/Seller');
const Shopper = require('../../models/Shopper');
const SellerSubscription = require('../../models/SellerSubscription');
const sequelize = require('../../config/database');
const SellerValidator = require('../../validators/seller-validator');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const AsaasMapper = require('../../utils/asaas-mapper');
const { formatError, createError } = require('../../utils/errorHandler');
const { Op } = require('sequelize');

describe('SellerService - Testes de Integração', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock da transação do Sequelize
        mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn()
        };
        
        sequelize.transaction.mockImplementation(async (callback) => {
            return callback(mockTransaction);
        });
        
        // Mock local dos validators e services
        const SellerValidator = require('../../validators/seller-validator');
        const PaymentMethodsValidator = require('../../validators/payment-methods-validator');
        const AsaasCustomerService = require('../../services/asaas/customer.service');
        const AsaasMapper = require('../../utils/asaas-mapper');
        
        // Reset dos mocks
        SellerValidator.validateId = jest.fn();
        SellerValidator.validateSellerData = jest.fn();
        SellerValidator.validateSellerUpdateData = jest.fn();
        SellerValidator.validateNuvemshopId = jest.fn();
        PaymentMethodsValidator.validatePaymentMethods = jest.fn();
        AsaasCustomerService.findByCpfCnpj = jest.fn();
        AsaasCustomerService.createOrUpdate = jest.fn();
        AsaasMapper.mapSellerToCustomer = jest.fn();
    });

    test('deve buscar um seller pelo ID com sucesso', async () => {
        const mockSeller = { 
            id: 1, 
            nuvemshop_id: 123456, 
            user_id: 1,
            payments_customer_id: 'asaas_123' 
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);

        const result = await SellerService.get(1);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSeller);
        expect(SellerValidator.validateId).toHaveBeenCalledWith(1);
        expect(Seller.findByPk).toHaveBeenCalledWith(1);
    });

    test('deve retornar erro quando seller não encontrado pelo ID', async () => {
        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(null);
        createError.mockReturnValue({ 
            success: false, 
            message: 'Vendedor com ID 1 não encontrado', 
            code: 404 
        });

        const result = await SellerService.get(1);

        expect(result.success).toBe(false);
        expect(result.message).toContain('não encontrado');
        expect(result.code).toBe(404);
    });

    test('deve buscar um seller pelo nuvemshop_id com sucesso', async () => {
        const mockSeller = { 
            id: 1, 
            nuvemshop_id: 123456, 
            user_id: 1,
            payments_customer_id: 'asaas_123' 
        };

        SellerValidator.validateNuvemshopId.mockImplementation(() => {});
        Seller.findOne.mockResolvedValue(mockSeller);

        const result = await SellerService.getByNuvemshopId(123456);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSeller);
        expect(SellerValidator.validateNuvemshopId).toHaveBeenCalledWith(123456);
        expect(Seller.findOne).toHaveBeenCalledWith({
            where: { nuvemshop_id: 123456 }
        });
    });

    test('deve criar seller com sucesso quando não há duplicação', async () => {
        const mockSellerData = {
            nuvemshop_id: 123456,
            email: 'seller@example.com',
            cpfCnpj: '12345678901',
            nuvemshop_info: JSON.stringify({ storeName: 'My Store' }),
            nuvemshop_api_token: 'token123'
        };

        // Setup dos mocks
        SellerValidator.validateSellerData.mockImplementation(() => {});
        Seller.findOne.mockResolvedValue(null); // Não existe Seller com este nuvemshop_id
        UserData.findOne.mockResolvedValue(null); // Não existe UserData com este cpfCnpj
        AsaasCustomerService.findByCpfCnpj.mockResolvedValue({ success: false });
        AsaasCustomerService.createOrUpdate.mockResolvedValue({ 
            success: true, 
            data: { id: 'asaas_123' } 
        });

        const mockUserData = { id: 1, cpfCnpj: '12345678901' };
        const mockUser = { id: 1, email: 'seller@example.com' };
        const mockSeller = { 
            id: 1, 
            nuvemshop_id: 123456, 
            user_id: 1,
            payments_customer_id: 'asaas_123' 
        };
        const mockSellerWithRelations = {
            ...mockSeller,
            user: { ...mockUser, userData: mockUserData }
        };

        UserData.create.mockResolvedValue(mockUserData);
        User.create.mockResolvedValue(mockUser);
        Seller.create.mockResolvedValue(mockSeller);
        Seller.findByPk.mockResolvedValue(mockSellerWithRelations);
        
        // Mock para SellerSubscription (assinatura)
        SellerSubscription.findOne.mockResolvedValue(null); // Não existe assinatura
        SellerSubscription.create.mockResolvedValue({
            id: 1,
            seller_id: 1,
            plan_name: 'Plano Básico',
            value: 29.90,
            status: 'active',
            cycle: 'MONTHLY'
        });

        const result = await SellerService.create(mockSellerData);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Vendedor criado com sucesso');
        expect(result.data).toEqual(mockSellerWithRelations);
        
        // Verificar se a assinatura foi criada
        expect(SellerSubscription.findOne).toHaveBeenCalledWith({
            where: { seller_id: 1 },
            transaction: mockTransaction
        });
        expect(SellerSubscription.create).toHaveBeenCalledWith(
            expect.objectContaining({
                seller_id: 1,
                plan_name: 'Plano Básico',
                value: 29.90,
                status: 'active',
                cycle: 'MONTHLY'
            }),
            { transaction: mockTransaction }
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('Vendedor criado com sucesso');
        expect(result.data).toEqual(mockSellerWithRelations);
        expect(Seller.findOne).toHaveBeenCalledWith({ 
            where: { nuvemshop_id: 123456 } 
        });
        expect(UserData.findOne).toHaveBeenCalledWith({ 
            where: { cpfCnpj: '12345678901' } 
        });
        expect(AsaasCustomerService.findByCpfCnpj).toHaveBeenCalledWith('12345678901', 'SELLERS');
        expect(AsaasCustomerService.createOrUpdate).toHaveBeenCalled();
        expect(UserData.create).toHaveBeenCalledWith(
            expect.objectContaining({
                cpfCnpj: '12345678901',
                email: 'seller@example.com'
            }),
            { transaction: mockTransaction }
        );
        expect(User.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'seller@example.com',
                user_data_id: 1
            }),
            { transaction: mockTransaction }
        );
        expect(Seller.create).toHaveBeenCalledWith(
            expect.objectContaining({
                nuvemshop_id: 123456,
                user_id: 1,
                payments_customer_id: 'asaas_123'
            }),
            { transaction: mockTransaction }
        );
    });

    test('deve detectar duplicação de nuvemshop_id', async () => {
        const mockSellerData = {
            nuvemshop_id: 123456,
            email: 'seller@example.com',
            cpfCnpj: '12345678901'
        };

        SellerValidator.validateSellerData.mockImplementation(() => {});
        
        // Mock para Seller existente com mesmo nuvemshop_id
        const existingSeller = { 
            id: 5, 
            nuvemshop_id: 123456
        };
        
        Seller.findOne.mockResolvedValue(existingSeller);
        
        createError.mockReturnValue({ 
            success: false, 
            message: 'Já existe um vendedor com este ID da Nuvemshop', 
            code: 400 
        });

        const result = await SellerService.create(mockSellerData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Já existe um vendedor');
        expect(result.code).toBe(400);
        expect(Seller.findOne).toHaveBeenCalledWith({ 
            where: { nuvemshop_id: 123456 } 
        });
        expect(UserData.create).not.toHaveBeenCalled();
        expect(User.create).not.toHaveBeenCalled();
        expect(Seller.create).not.toHaveBeenCalled();
    });

    test('deve detectar duplicação de cpfCnpj já vinculado a outro seller', async () => {
        const mockSellerData = {
            nuvemshop_id: 123456,
            email: 'seller@example.com',
            cpfCnpj: '12345678901'
        };

        SellerValidator.validateSellerData.mockImplementation(() => {});
        
        // Setup para duplicação de CPF/CNPJ
        Seller.findOne.mockImplementationOnce(() => null); // Não existe seller com este nuvemshop_id
        
        // Mas existe UserData com este cpfCnpj
        const mockUserData = { id: 2, cpfCnpj: '12345678901' };
        const mockUser = { id: 3, user_data_id: 2 };
        const mockExistingSeller = { id: 10, user_id: 3 };
        
        UserData.findOne.mockResolvedValue(mockUserData);
        User.findOne.mockResolvedValue(mockUser);
        Seller.findOne.mockImplementationOnce(() => mockExistingSeller); // Na segunda chamada, retorna um seller vinculado
        
        createError.mockReturnValue({ 
            success: false, 
            message: 'Já existe um vendedor associado ao CPF/CNPJ 12345678901', 
            code: 400 
        });

        const result = await SellerService.create(mockSellerData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Já existe um vendedor associado ao CPF/CNPJ');
        expect(result.code).toBe(400);
    });

    test('deve excluir seller com sucesso', async () => {
        const mockUser = { 
            id: 1, 
            user_data_id: 1,
            destroy: jest.fn().mockResolvedValue({})
        };
        
        const mockUserData = {
            id: 1,
            destroy: jest.fn().mockResolvedValue({})
        };
        
        const mockSeller = {
            id: 1,
            user: mockUser,
            destroy: jest.fn().mockResolvedValue({})
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);
        
        // Não há outros sellers ou shoppers vinculados ao mesmo user
        Shopper.count.mockResolvedValue(0);
        Seller.count.mockResolvedValue(0);
        
        // Não há outros users vinculados ao mesmo userData
        User.count.mockResolvedValue(0);
        User.findByPk.mockResolvedValue(mockUser);
        UserData.findByPk.mockResolvedValue(mockUserData);

        const result = await SellerService.delete(1);

        expect(result.success).toBe(true);
        expect(result.message).toContain('excluído com sucesso');
        expect(mockSeller.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
        expect(mockUser.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
        expect(mockUserData.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
        expect(sequelize.transaction).toHaveBeenCalled();
    });

    test('deve manter user quando está vinculado a outro shopper', async () => {
        const mockUser = { 
            id: 1, 
            user_data_id: 1,
            destroy: jest.fn().mockResolvedValue({})
        };
        
        const mockSeller = {
            id: 1,
            user: mockUser,
            destroy: jest.fn().mockResolvedValue({})
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);
        
        // Há um shopper vinculado ao mesmo user
        Shopper.count.mockResolvedValue(1);
        Seller.count.mockResolvedValue(0);

        const result = await SellerService.delete(1);

        expect(result.success).toBe(true);
        expect(result.message).toContain('excluído com sucesso');
        expect(mockSeller.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
        expect(mockUser.destroy).not.toHaveBeenCalled(); // Não deve excluir o user
        expect(sequelize.transaction).toHaveBeenCalled();
    });

    test('deve atualizar métodos de pagamento com sucesso', async () => {
        const mockSeller = {
            id: 1,
            accepted_payment_methods: ['credit_card', 'pix'],
            save: jest.fn().mockResolvedValue({})
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);

        const newMethods = ['credit_card', 'boleto', 'pix'];

        const result = await SellerService.updatePaymentMethods(1, newMethods);

        expect(result.success).toBe(true);
        expect(mockSeller.accepted_payment_methods).toEqual(newMethods);
        expect(mockSeller.save).toHaveBeenCalled();
    });

    test('deve adicionar método de pagamento com sucesso', async () => {
        const mockSeller = {
            id: 1,
            accepted_payment_methods: ['credit_card', 'pix'],
            save: jest.fn().mockResolvedValue({}),
            isPaymentMethodAccepted: jest.fn().mockReturnValue(false),
            addPaymentMethod: jest.fn()
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);

        const result = await SellerService.addPaymentMethod(1, 'boleto');

        expect(result.success).toBe(true);
        expect(mockSeller.addPaymentMethod).toHaveBeenCalledWith('boleto');
        expect(mockSeller.save).toHaveBeenCalled();
    });

    test('deve remover método de pagamento com sucesso', async () => {
        const mockSeller = {
            id: 1,
            accepted_payment_methods: ['credit_card', 'pix', 'boleto'],
            save: jest.fn().mockResolvedValue({}),
            isPaymentMethodAccepted: jest.fn().mockReturnValue(true),
            removePaymentMethod: jest.fn()
        };

        SellerValidator.validateId.mockImplementation(() => {});
        Seller.findByPk.mockResolvedValue(mockSeller);

        const result = await SellerService.removePaymentMethod(1, 'boleto');

        expect(result.success).toBe(true);
        expect(mockSeller.removePaymentMethod).toHaveBeenCalledWith('boleto');
        expect(mockSeller.save).toHaveBeenCalled();
    });

    // Novos testes para aumentar coverage
    describe('getAll', () => {
        test('deve retornar todos os sellers com sucesso', async () => {
            const mockSellers = [
                { id: 1, nuvemshop_id: 123456, user_id: 1 },
                { id: 2, nuvemshop_id: 789012, user_id: 2 }
            ];

            Seller.findAll.mockResolvedValue(mockSellers);

            const result = await SellerService.getAll();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSellers);
            expect(Seller.findAll).toHaveBeenCalled();
        });

        test('deve retornar erro quando falha ao buscar todos os sellers', async () => {
            const error = new Error('Erro de conexão');
            Seller.findAll.mockRejectedValue(error);

            const result = await SellerService.getAll();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });
    });

    describe('Error handling edge cases', () => {
        test('deve tratar erro de validação no get', async () => {
            SellerValidator.validateId.mockImplementation(() => {
                throw new Error('ID inválido');
            });

            const result = await SellerService.get('invalid');

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID inválido');
        });

        test('deve tratar erro de validação no getByNuvemshopId', async () => {
            const error = new Error('Nuvemshop ID inválido');
            Seller.findOne.mockRejectedValue(error);

            const result = await SellerService.getByNuvemshopId(123);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Nuvemshop ID inválido');
        });
    });

    describe('update - Atualizar seller', () => {
        test('deve atualizar seller com sucesso', async () => {
            const mockSeller = {
                id: 1,
                nuvemshop_id: 123456,
                user_id: 1,
                user: { 
                    id: 1,
                    userData: { id: 1, cpfCnpj: '12345678901' },
                    update: jest.fn().mockResolvedValue()
                },
                update: jest.fn().mockResolvedValue(),
                reload: jest.fn().mockResolvedValue(),
                toJSON: jest.fn().mockReturnValue({
                    id: 1,
                    nuvemshop_id: 123456,
                    name: 'Seller Atualizado'
                })
            };

            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            Seller.findByPk.mockResolvedValue(mockSeller);

            const updateData = { nuvemshop_info: '{"test": "data"}' };
            const result = await SellerService.update(1, updateData);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(mockSeller.update).toHaveBeenCalled();
        });

        test('deve retornar erro quando seller não encontrado no update', async () => {
            // Resetar TODOS os mocks para este teste específico
            jest.clearAllMocks();
            
            // Mock para validação passar
            SellerValidator.validateId.mockImplementation(() => {});
            SellerValidator.validateSellerUpdateData.mockImplementation(() => {});
            
            // Mock para não encontrar o seller - o mais importante
            Seller.findByPk.mockResolvedValue(null);
            
            // Garantir que não haverá consultas de duplicação
            UserData.findOne.mockResolvedValue(null);
            User.findOne.mockResolvedValue(null);
            Seller.findOne.mockResolvedValue(null);
            AsaasCustomerService.findByCpfCnpj.mockResolvedValue({ success: false });
            
            // Mock da transação
            sequelize.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransaction);
            });
            
            // Mock do createError
            createError.mockImplementation((message, code) => ({ 
                success: false, 
                message, 
                code 
            }));

            const result = await SellerService.update(999, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Vendedor com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID não fornecido no update', async () => {
            // Resetar TODOS os mocks para este teste específico
            jest.clearAllMocks();
            
            // Mock para validação falhar
            SellerValidator.validateId.mockImplementation(() => {
                const error = new Error('ID inválido');
                error.code = 400;
                throw error;
            });
            
            // Mock do formatError
            formatError.mockImplementation((error) => ({ 
                success: false, 
                message: error.message,
                code: error.code || 400 
            }));

            const result = await SellerService.update(null, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID inválido');
            expect(result.code).toBe(400);
        });
    });

    describe('findByCpfCnpj - Buscar por CPF/CNPJ', () => {
        test('deve buscar seller pelo CPF/CNPJ com sucesso', async () => {
            const mockUserData = { id: 1, cpfCnpj: '12345678901' };
            const mockUser = { id: 1, user_data_id: 1 };
            const mockSeller = { 
                id: 1, 
                user_id: 1
            };

            UserData.findOne.mockResolvedValue(mockUserData);
            User.findOne.mockResolvedValue(mockUser);
            Seller.findOne.mockResolvedValue(mockSeller);

            const result = await SellerService.findByCpfCnpj('12345678901');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(1);
        });

        test('deve retornar null quando CPF/CNPJ não encontrado', async () => {
            UserData.findOne.mockResolvedValue(null);

            const result = await SellerService.findByCpfCnpj('99999999999');

            expect(result.success).toBe(true);
            expect(result.data).toBe(null);
        });

        test('deve retornar erro quando CPF/CNPJ não fornecido', async () => {
            // Resetar TODOS os mocks para este teste específico
            jest.clearAllMocks();
            
            // Mock do createError
            createError.mockImplementation((message, code) => ({ 
                success: false, 
                message, 
                code 
            }));
            
            // Não passar nenhum parâmetro para simular CPF/CNPJ não fornecido
            const result = await SellerService.findByCpfCnpj();

            expect(result.success).toBe(false);
            expect(result.message).toBe('CPF/CNPJ é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('updateStoreInfo - Atualizar informações da loja', () => {
        test('deve atualizar informações da loja com sucesso', async () => {
            const mockSeller = {
                id: 1,
                nuvemshop_id: 123456,
                save: jest.fn().mockResolvedValue(),
                nuvemshop_info: null,
                app_status: null
            };

            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            Seller.findOne.mockResolvedValue(mockSeller);
            Seller.findByPk.mockResolvedValue(mockSeller);
            SellerSubscription.findOne.mockResolvedValue(null); // Não tem assinatura ainda

            const storeInfo = { email: 'new@test.com', name: { pt: 'Nova Loja' }, plan_name: 'PREMIUM' };
            const result = await SellerService.updateStoreInfo(123456, storeInfo);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(mockSeller.save).toHaveBeenCalled();
        });

        test('deve retornar erro quando seller não encontrado no updateStoreInfo', async () => {
            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            Seller.findOne.mockResolvedValue(null);

            const result = await SellerService.updateStoreInfo(999, { email: 'test@test.com' });

            expect(result.success).toBe(false);
            expect(result.message).toContain('não encontrado');
        });
    });

    describe('getByStoreId - Buscar por Store ID', () => {
        test('deve buscar seller pelo store ID com sucesso', async () => {
            const mockSeller = {
                id: 1,
                nuvemshop_id: 123456
            };

            Seller.findOne.mockResolvedValue(mockSeller);

            const result = await SellerService.getByStoreId('123456');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(1);
        });

        test('deve retornar erro quando store ID não encontrado', async () => {
            // Resetar TODOS os mocks para este teste específico
            jest.clearAllMocks();
            
            // Mock do createError
            createError.mockImplementation((message, code) => ({ 
                success: false, 
                message, 
                code 
            }));
            
            // Mock para não encontrar seller
            Seller.findOne.mockResolvedValue(null);

            const result = await SellerService.getByStoreId('999');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Seller com store_id 999 não encontrado');
            expect(result.code).toBe(404);
        });
    });

    describe('Testes adicionais para aumentar cobertura', () => {
        test('deve testar delete de seller', async () => {
            const mockSeller = {
                id: 1,
                destroy: jest.fn().mockResolvedValue()
            };

            Seller.findByPk.mockResolvedValue(mockSeller);

            const result = await SellerService.delete(1);

            expect(result.success).toBe(true);
            expect(result.message).toContain('excluído com sucesso');
        });

        test('deve testar syncWithAsaas', async () => {
            const mockSeller = {
                id: 1,
                user: {
                    userData: { cpfCnpj: '12345678901' }
                }
            };

            Seller.findByPk.mockResolvedValue(mockSeller);
            const AsaasMapper = require('../../utils/asaas-mapper');
            AsaasMapper.mapSellerToCustomer = jest.fn().mockReturnValue({
                name: 'Test Seller',
                cpfCnpj: '12345678901'
            });

            const AsaasCustomerService = require('../../services/asaas/customer.service');
            AsaasCustomerService.createOrUpdate = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 'asaas_123' }
            });

            const result = await SellerService.syncWithAsaas(1);

            expect(result.success).toBe(true);
        });

        test('deve testar updatePaymentMethods', async () => {
            const mockSeller = {
                id: 1,
                save: jest.fn().mockResolvedValue()
            };

            Seller.findByPk.mockResolvedValue(mockSeller);

            const PaymentMethodsValidator = require('../../validators/payment-methods-validator');
            PaymentMethodsValidator.validatePaymentMethods = jest.fn();

            const result = await SellerService.updatePaymentMethods(1, ['credit_card', 'pix']);

            expect(result.success).toBe(true);
            expect(result.message).toContain('atualizados com sucesso');
        });

        test('deve testar savePaymentsInfo', async () => {
            const paymentsData = {
                customer: 'cus_123',
                id: 'sub_123',
                nextDueDate: '2025-01-01',
                status: 'active'
            };

            // Mock do método upsert que não estava sendo mockado
            Seller.upsert = jest.fn().mockResolvedValue([{ dataValues: { id: 1 } }, true]);

            const result = await SellerService.savePaymentsInfo('store123', paymentsData);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        test('deve testar saveSubAccountInfo', async () => {
            const mockSeller = {
                id: 1,
                user: {
                    userData: { id: 1, update: jest.fn() },
                    update: jest.fn()
                },
                update: jest.fn(),
                reload: jest.fn()
            };

            const accountData = {
                id: 'acc_123',
                walletId: 'wallet_123',
                apiKey: 'key_123',
                cpfCnpj: '12345678901'
            };

            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            Seller.findOne.mockResolvedValue(mockSeller);

            const result = await SellerService.saveSubAccountInfo('store123', accountData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('subconta salvas com sucesso');
        });
    });

});
