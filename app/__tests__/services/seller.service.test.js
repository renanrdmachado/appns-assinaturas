// Precisamos fazer mock dos modelos e conexão com o banco ANTES de importar o serviço
// para evitar que as associações dos modelos sejam executadas

// Mock dos módulos do banco de dados
jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({})
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
  validateNuvemshopId: jest.fn().mockReturnValue({ isValid: true })
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

// Agora importamos os módulos que serão usados
const SellerService = require('../../services/seller.service');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const Seller = require('../../models/Seller');
const Shopper = require('../../models/Shopper');
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

        const result = await SellerService.create(mockSellerData);

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
});
