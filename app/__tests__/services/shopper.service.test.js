// Mock dos módulos do banco de dados ANTES de importar qualquer coisa
jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({})
}));

// Mock dos validators
jest.mock('../../validators/shopper-validator', () => ({
  validateId: jest.fn(),
  validateShopperData: jest.fn(),
  validateShopperUpdateData: jest.fn(),
  validateNuvemshopId: jest.fn()
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
  findAll: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../models/ShopperSubscription', () => ({
  findOne: jest.fn(),
  count: jest.fn(),
  belongsTo: jest.fn()
}));

// Apenas fazemos mock do que é externo ao nosso serviço principal
jest.mock('../../services/asaas/customer.service', () => ({
  findByCpfCnpj: jest.fn().mockResolvedValue({ success: false }),
  createOrUpdate: jest.fn().mockResolvedValue({ success: true, data: { id: 'asaas123' } }),
  SHOPPER_GROUP: 'SHOPPER'
}));

// Mock apenas do validador para garantir que sempre passa
jest.mock('../../validators/shopper-validator', () => ({
  validateShopperData: jest.fn().mockReturnValue({ isValid: true }),
  validateId: jest.fn().mockReturnValue({ isValid: true }),
  validateNuvemshopId: jest.fn().mockReturnValue({ isValid: true }),
  validateShopperUpdateData: jest.fn().mockReturnValue({ isValid: true })
}));

// Mock do error handler
jest.mock('../../utils/errorHandler', () => ({
  formatError: jest.fn(error => ({ success: false, message: error.message })),
  createError: jest.fn((message, code) => ({ success: false, message, code }))
}));

// Mock para AsaasMapper
jest.mock('../../utils/asaas-mapper', () => ({
  mapRawDataToCustomer: jest.fn().mockReturnValue({
    name: 'Shopper Test',
    cpfCnpj: '12345678901',
    email: 'shopper@example.com'
  }),
  mapShopperToCustomer: jest.fn()
}));

// Agora importamos os módulos que serão usados

const ShopperService = require('../../services/shopper.service');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const Shopper = require('../../models/Shopper');
const ShopperSubscription = require('../../models/ShopperSubscription');
const sequelize = require('../../config/database');
const ShopperValidator = require('../../validators/shopper-validator');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const AsaasMapper = require('../../utils/asaas-mapper');
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
        
        // Mock local dos validators e services
        const ShopperValidator = require('../../validators/shopper-validator');
        const AsaasCustomerService = require('../../services/asaas/customer.service');
        const AsaasMapper = require('../../utils/asaas-mapper');
        
        // Reset dos mocks
        ShopperValidator.validateId = jest.fn();
        ShopperValidator.validateShopperData = jest.fn();
        ShopperValidator.validateShopperUpdateData = jest.fn();
        ShopperValidator.validateNuvemshopId = jest.fn();
        AsaasCustomerService.findByCpfCnpj = jest.fn();
        AsaasCustomerService.createOrUpdate = jest.fn();
        AsaasMapper.mapShopperToCustomer = jest.fn();
        
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

        // Mock para UserData criado
        const mockUserData = { id: 1, cpfCnpj: '12345678901' };
        UserData.create.mockResolvedValue(mockUserData);

        // Mock para User existente com Shopper já vinculado
        const existingUser = { 
            id: 2, 
            email: 'joao@email.com',
            update: jest.fn()
        };
        const existingShopper = { id: 5, user_id: 2 };

        User.findOne.mockResolvedValue(existingUser);
        Shopper.findOne.mockResolvedValue(existingShopper); // Já existe Shopper

        // Mock do erro que deve ser lançado quando há duplicação
        const duplicateError = new Error('Já existe um shopper cadastrado com o email joao@email.com');
        formatError.mockReturnValue({
            success: false,
            message: 'Já existe um shopper cadastrado com o email joao@email.com'
        });

        // Restaurar a transação para o comportamento normal
        sequelize.transaction.mockImplementation(async (callback) => {
            return await callback(mockTransaction);
        });

        const result = await ShopperService.create(mockShopperData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Já existe um shopper cadastrado');
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

    // Novos testes para aumentar coverage
    describe('get', () => {
        test('deve buscar shopper pelo ID com sucesso', async () => {
            const mockShopper = {
                id: 1,
                nuvemshop_id: 123456,
                user_id: 1,
                payments_customer_id: 'asaas_123'
            };

            Shopper.findByPk.mockResolvedValue(mockShopper);

            const result = await ShopperService.get(1);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockShopper);
        });

        test('deve retornar erro quando shopper não encontrado', async () => {
            Shopper.findByPk.mockResolvedValue(null);

            const result = await ShopperService.get(1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('não encontrado');
        });

        test('deve tratar erro de banco no get', async () => {
            const error = new Error('Erro de conexão');
            Shopper.findByPk.mockRejectedValue(error);

            const result = await ShopperService.get(1);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });
    });

    describe('getAll', () => {
        test('deve retornar todos os shoppers com sucesso', async () => {
            const mockShoppers = [
                { id: 1, nuvemshop_id: 123456, user_id: 1 },
                { id: 2, nuvemshop_id: 789012, user_id: 2 }
            ];

            Shopper.findAll.mockResolvedValue(mockShoppers);

            const result = await ShopperService.getAll();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockShoppers);
            expect(Shopper.findAll).toHaveBeenCalled();
        });

        test('deve retornar erro quando falha ao buscar todos os shoppers', async () => {
            const error = new Error('Erro de conexão');
            Shopper.findAll.mockRejectedValue(error);

            const result = await ShopperService.getAll();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });
    });

    describe('update - Atualizar shopper', () => {
        test('deve atualizar shopper com sucesso', async () => {
            const mockShopper = {
                id: 1,
                user: {
                    id: 1,
                    userData: { id: 1, cpfCnpj: '12345678901' },
                    update: jest.fn().mockResolvedValue()
                },
                update: jest.fn().mockResolvedValue(),
                reload: jest.fn().mockResolvedValue()
            };

            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            Shopper.findByPk.mockResolvedValue(mockShopper);

            const updateData = { nuvemshop_info: '{"test": "data"}' };
            const result = await ShopperService.update(1, updateData);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(mockShopper.update).toHaveBeenCalled();
        });

        test('deve retornar erro quando shopper não encontrado no update', async () => {
            Shopper.findByPk.mockResolvedValue(null);

            const result = await ShopperService.update(999, { name: 'Test' });

            expect(result.success).toBe(false);
            expect(result.message).toBe('Shopper com ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando ID não fornecido no update', async () => {
            // Mock para validação falhar
            ShopperValidator.validateId.mockImplementation(() => {
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
            
            const result = await ShopperService.update();

            expect(result.success).toBe(false);
            expect(result.message).toBe('ID inválido');
            expect(result.code).toBe(400);
        });
    });

    describe('getByEmail - Buscar por email', () => {
        test('deve buscar shopper pelo email com sucesso', async () => {
            const mockShopper = { 
                id: 1, 
                user: { id: 1, email: 'test@example.com' }
            };

            Shopper.findOne.mockResolvedValue(mockShopper);

            const result = await ShopperService.getByEmail('test@example.com');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(1);
        });

        test('deve retornar erro quando email não encontrado', async () => {
            Shopper.findOne.mockResolvedValue(null);

            const result = await ShopperService.getByEmail('notfound@example.com');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Shopper com email notfound@example.com não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando email não fornecido', async () => {
            const result = await ShopperService.getByEmail();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Email é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('getByCpfCnpj - Buscar por CPF/CNPJ', () => {
        test('deve buscar shopper pelo CPF/CNPJ com sucesso', async () => {
            const mockShopper = { 
                id: 1, 
                user: {
                    id: 1,
                    userData: { id: 1, cpfCnpj: '12345678901' }
                }
            };

            Shopper.findOne.mockResolvedValue(mockShopper);

            const result = await ShopperService.getByCpfCnpj('12345678901');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(1);
        });

        test('deve retornar erro quando CPF/CNPJ não encontrado', async () => {
            Shopper.findOne.mockResolvedValue(null);

            const result = await ShopperService.getByCpfCnpj('99999999999');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Shopper com CPF/CNPJ 99999999999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando CPF/CNPJ não fornecido', async () => {
            const result = await ShopperService.getByCpfCnpj();

            expect(result.success).toBe(false);
            expect(result.message).toBe('CPF/CNPJ é obrigatório');
            expect(result.code).toBe(400);
        });
    });

    describe('getByNuvemshopId - Buscar por Nuvemshop ID', () => {
        test('deve buscar shopper pelo nuvemshop_id com sucesso', async () => {
            const mockShopper = {
                id: 1,
                nuvemshop_id: 123456
            };

            Shopper.findOne.mockResolvedValue(mockShopper);

            const result = await ShopperService.getByNuvemshopId(123456);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(1);
            expect(result.data.nuvemshop_id).toBe(123456);
        });

        test('deve retornar erro quando nuvemshop_id não encontrado', async () => {
            Shopper.findOne.mockResolvedValue(null);

            const result = await ShopperService.getByNuvemshopId(999);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Shopper com Nuvemshop ID 999 não encontrado');
            expect(result.code).toBe(404);
        });

        test('deve retornar erro quando nuvemshop_id não fornecido', async () => {
            // Mock para validação falhar
            ShopperValidator.validateNuvemshopId.mockImplementation(() => {
                const error = new Error('Nuvemshop ID inválido');
                error.code = 400;
                throw error;
            });
            
            // Mock do formatError
            formatError.mockImplementation((error) => ({ 
                success: false, 
                message: error.message,
                code: error.code || 400 
            }));
            
            const result = await ShopperService.getByNuvemshopId();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Nuvemshop ID inválido');
            expect(result.code).toBe(400);
        });
    });

    describe('Testes adicionais para aumentar cobertura', () => {
        test('deve testar delete de shopper', async () => {
            const mockShopper = {
                id: 1,
                user: { id: 1, user_data_id: 1 },
                destroy: jest.fn().mockResolvedValue()
            };

            ShopperValidator.validateId.mockImplementation(() => {});
            Shopper.findByPk.mockResolvedValue(mockShopper);
            ShopperSubscription.count.mockResolvedValue(0);

            const sequelize = require('../../config/database');
            sequelize.transaction = jest.fn().mockImplementation(async (callback) => {
                return await callback({});
            });

            const result = await ShopperService.delete(1);

            expect(result.success).toBe(true);
            expect(result.message).toContain('excluído com sucesso');
        });

        test('deve testar syncWithAsaas', async () => {
            const mockShopper = {
                id: 1,
                user: {
                    userData: { cpfCnpj: '12345678901' }
                },
                update: jest.fn().mockResolvedValue(),
                reload: jest.fn().mockResolvedValue()
            };

            Shopper.findByPk.mockResolvedValue(mockShopper);
            
            const AsaasMapper = require('../../utils/asaas-mapper');
            AsaasMapper.mapShopperToCustomer = jest.fn().mockReturnValue({
                name: 'Test Shopper',
                cpfCnpj: '12345678901'
            });

            const AsaasCustomerService = require('../../services/asaas/customer.service');
            AsaasCustomerService.createOrUpdate = jest.fn().mockResolvedValue({
                success: true,
                data: { id: 'asaas_123' }
            });

            const result = await ShopperService.syncWithAsaas(1);

            expect(result.success).toBe(true);
            expect(result.message).toContain('sincronizado com sucesso');
        });

        test('deve tratar erro quando CPF/CNPJ não encontrado em syncWithAsaas', async () => {
            const mockShopper = {
                id: 1,
                user: { userData: null }
            };

            Shopper.findByPk.mockResolvedValue(mockShopper);

            const result = await ShopperService.syncWithAsaas(1);

            expect(result.success).toBe(false);
            expect(result.message).toContain('CPF/CNPJ é obrigatório');
        });

        test('deve testar erro em getByEmail', async () => {
            const error = new Error('Erro de conexão');
            Shopper.findOne.mockRejectedValue(error);

            formatError.mockReturnValue({
                success: false,
                message: 'Erro de conexão'
            });

            const result = await ShopperService.getByEmail('test@test.com');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });

        test('deve testar erro em getByCpfCnpj', async () => {
            const error = new Error('Erro de conexão');
            Shopper.findOne.mockRejectedValue(error);

            formatError.mockReturnValue({
                success: false,
                message: 'Erro de conexão'
            });

            const result = await ShopperService.getByCpfCnpj('12345678901');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });

        test('deve testar erro em getByNuvemshopId', async () => {
            const error = new Error('Erro de conexão');
            Shopper.findOne.mockRejectedValue(error);

            formatError.mockReturnValue({
                success: false,
                message: 'Erro de conexão'
            });

            const result = await ShopperService.getByNuvemshopId(123456);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro de conexão');
        });
    });

});