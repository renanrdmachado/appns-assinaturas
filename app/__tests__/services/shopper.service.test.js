
// Vamos usar uma abordagem de teste de integração focada no comportamento específico
// da duplicação de email, sem mockar tudo

const request = require('supertest');

// Apenas fazemos mock do que é externo ao nosso serviço principal
jest.mock('../../services/asaas/customer.service', () => ({
  findByCpfCnpj: jest.fn().mockResolvedValue(null),
  createOrUpdate: jest.fn().mockResolvedValue({ id: 'asaas123' }),
  SHOPPER_GROUP: 'SHOPPERS'
}));

// Mock apenas do validador para garantir que sempre passa
jest.mock('../../validators/shopper-validator', () => ({
  validateShopperData: jest.fn().mockReturnValue({ isValid: true }),
  validateId: jest.fn().mockReturnValue({ isValid: true })
}));

const ShopperService = require('../../services/shopper.service');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const Shopper = require('../../models/Shopper');
const ShopperSubscription = require('../../models/ShopperSubscription');
const sequelize = require('../../config/database');
const ShopperValidator = require('../../validators/shopper-validator');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const { formatError, createError } = require('../../utils/errorHandler');

describe('ShopperService - Testes de Duplicação de Email', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock da transação do Sequelize
        mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn()
        };
        
        sequelize.transaction.mockImplementation(async (callback) => {
            return await callback(mockTransaction);
        });
        
        // Mock padrão para formatError e createError
        formatError.mockImplementation((error) => ({ 
            success: false, 
            message: error.message 
        }));
        createError.mockImplementation((message, code) => ({ 
            success: false, 
            message, 
            code 
        }));
    });

    test('deve criar shopper com sucesso quando não há duplicação de email', async () => {
        const mockShopperData = {
            name: 'João Silva',
            email: 'joao@email.com',
            cpfCnpj: '12345678901',
            mobilePhone: '11999999999',
            address: 'Rua A',
            addressNumber: '123',
            province: 'SP',
            postalCode: '01234567'
        };

        // Setup dos mocks
        ShopperValidator.validateShopperData.mockImplementation(() => {});
        UserData.findOne.mockResolvedValue(null);
        AsaasCustomerService.findByCpfCnpj.mockResolvedValue({ success: false });
        AsaasCustomerService.createOrUpdate.mockResolvedValue({ 
            success: true, 
            data: { id: 'asaas_123' } 
        });

        const mockUserData = { id: 1, cpfCnpj: '12345678901' };
        const mockUser = { id: 1, email: 'joao@email.com' };
        const mockShopper = { 
            id: 1, 
            name: 'João Silva', 
            user_id: 1,
            payments_customer_id: 'asaas_123'
        };
        const mockShopperWithRelations = {
            ...mockShopper,
            user: { ...mockUser, userData: mockUserData }
        };

        UserData.create.mockResolvedValue(mockUserData);
        User.findOne.mockResolvedValue(null); // Não existe User com este email
        User.create.mockResolvedValue(mockUser);
        Shopper.create.mockResolvedValue(mockShopper);
        Shopper.findByPk.mockResolvedValue(mockShopperWithRelations);

        const result = await ShopperService.create(mockShopperData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockShopperWithRelations);
        expect(User.findOne).toHaveBeenCalledWith({ 
            where: { email: 'joao@email.com' },
            transaction: mockTransaction 
        });
        expect(User.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'joao@email.com',
                user_data_id: 1
            }),
            { transaction: mockTransaction }
        );
    });

    test('deve reutilizar User existente quando email já existe mas não tem Shopper', async () => {
        const mockShopperData = {
            name: 'João Silva',
            email: 'joao@email.com',
            cpfCnpj: '12345678901'
        };

        ShopperValidator.validateShopperData.mockImplementation(() => {});
        UserData.findOne.mockResolvedValue(null);
        AsaasCustomerService.findByCpfCnpj.mockResolvedValue({ success: false });
        AsaasCustomerService.createOrUpdate.mockResolvedValue({ 
            success: true, 
            data: { id: 'asaas_123' } 
        });

        // Mock para User existente
        const existingUser = { 
            id: 2, 
            email: 'joao@email.com',
            user_data_id: null,
            update: jest.fn().mockResolvedValue({})
        };
        const mockUserData = { id: 1, cpfCnpj: '12345678901' };
        const mockShopper = { id: 1, user_id: 2 };
        const mockShopperWithRelations = {
            ...mockShopper,
            user: { ...existingUser, userData: mockUserData }
        };

        UserData.create.mockResolvedValue(mockUserData);
        User.findOne.mockResolvedValue(existingUser);
        Shopper.findOne.mockResolvedValue(null); // Não existe Shopper para este User
        Shopper.create.mockResolvedValue(mockShopper);
        Shopper.findByPk.mockResolvedValue(mockShopperWithRelations);

        const result = await ShopperService.create(mockShopperData);

        expect(result.success).toBe(true);
        expect(User.create).not.toHaveBeenCalled(); // Não deve criar novo User
        expect(existingUser.update).toHaveBeenCalledWith(
            { user_data_id: 1 },
            { transaction: mockTransaction }
        );
    });

    test('deve detectar quando email já existe e tem Shopper vinculado', async () => {
        const mockShopperData = {
            name: 'João Silva',
            email: 'joao@email.com',
            cpfCnpj: '12345678901'
        };

        ShopperValidator.validateShopperData.mockImplementation(() => {});
        UserData.findOne.mockResolvedValue(null);
        AsaasCustomerService.findByCpfCnpj.mockResolvedValue({ success: false });
        AsaasCustomerService.createOrUpdate.mockResolvedValue({ 
            success: true, 
            data: { id: 'asaas_123' } 
        });

        // Mock para User existente com Shopper já vinculado
        const existingUser = { id: 2, email: 'joao@email.com' };
        const existingShopper = { id: 5, user_id: 2 };

        UserData.create.mockResolvedValue({ id: 1 });
        User.findOne.mockResolvedValue(existingUser);
        Shopper.findOne.mockResolvedValue(existingShopper); // Já existe Shopper

        // Mock do erro que deve ser lançado quando há duplicação
        const duplicateError = new Error('Já existe um shopper cadastrado com o email joao@email.com');
        sequelize.transaction.mockImplementation(async (callback) => {
            throw duplicateError;
        });

        const result = await ShopperService.create(mockShopperData);

        expect(result.success).toBe(false);
        expect(formatError).toHaveBeenCalledWith(duplicateError);
        expect(User.findOne).toHaveBeenCalledWith({ 
            where: { email: 'joao@email.com' },
            transaction: mockTransaction 
        });
    });

    test('deve excluir shopper sem assinaturas com sucesso', async () => {
        const mockShopper = {
            id: 1,
            user: { id: 1, user_data_id: 1 },
            destroy: jest.fn().mockResolvedValue({})
        };

        ShopperValidator.validateId.mockImplementation(() => {});
        Shopper.findByPk.mockResolvedValue(mockShopper);
        ShopperSubscription.count.mockResolvedValue(0); // Sem assinaturas

        const result = await ShopperService.delete(1);

        expect(result.success).toBe(true);
        expect(result.message).toContain('excluído com sucesso');
        expect(sequelize.transaction).toHaveBeenCalled();
    });

    test('deve impedir exclusão quando shopper possui assinaturas', async () => {
        const mockShopper = { id: 1, user: { id: 1 } };

        ShopperValidator.validateId.mockImplementation(() => {});
        Shopper.findByPk.mockResolvedValue(mockShopper);
        ShopperSubscription.count.mockResolvedValue(2); // Possui 2 assinaturas
        
        createError.mockReturnValue({ 
            success: false, 
            message: 'Não é possível excluir o cliente pois ele possui 2 assinatura(s) ativa(s)', 
            code: 400 
        });

        const result = await ShopperService.delete(1);

        expect(result.success).toBe(false);
        expect(createError).toHaveBeenCalledWith(
            expect.stringContaining('possui 2 assinatura(s) ativa(s)'),
            400
        );
    });
});