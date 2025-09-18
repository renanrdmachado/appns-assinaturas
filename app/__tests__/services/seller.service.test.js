// Precisamos mockar banco/validators/modelos/serviços antes de importar o serviço

// sequelize/database
jest.mock('../../config/database', () => ({
    transaction: jest.fn().mockImplementation(async (cb) => {
        const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        return cb ? cb(mockTransaction) : mockTransaction;
    }),
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({})
}));

// validators
jest.mock('../../validators/seller-validator', () => ({
    validateId: jest.fn(),
    validateSellerData: jest.fn(),
    validateSellerUpdateData: jest.fn(),
    validateNuvemshopId: jest.fn()
}));

jest.mock('../../validators/payment-methods-validator', () => ({
    validatePaymentMethods: jest.fn(),
    validateSinglePaymentMethod: jest.fn()
}));

// error handler
jest.mock('../../utils/errorHandler', () => ({
    formatError: jest.fn((error) => ({ success: false, message: error.message, code: error.code })),
    createError: jest.fn((message, code) => ({ success: false, message, code }))
}));

// asaas services/mapper
jest.mock('../../services/asaas/customer.service', () => ({
    findByCpfCnpj: jest.fn(),
    createOrUpdate: jest.fn(),
    get: jest.fn(),
    SELLER_GROUP: 'SELLERS'
}));

jest.mock('../../utils/asaas-mapper', () => ({
    mapSellerToCustomer: jest.fn(),
    mapRawDataToCustomer: jest.fn()
}));

// models
jest.mock('../../models/User', () => ({
    findOne: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    hasMany: jest.fn()
}));

jest.mock('../../models/UserData', () => ({
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    hasMany: jest.fn()
}));

jest.mock('../../models/Seller', () => {
    function Seller() { }
    Seller.findOne = jest.fn();
    Seller.findAll = jest.fn();
    Seller.findByPk = jest.fn();
    Seller.count = jest.fn();
    Seller.create = jest.fn();
    Seller.upsert = jest.fn();
    Seller.belongsTo = jest.fn();
    return Seller;
});

jest.mock('../../models/Shopper', () => ({
    findOne: jest.fn(),
    count: jest.fn(),
    belongsTo: jest.fn()
}));

jest.mock('../../models/SellerSubscription', () => ({
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    belongsTo: jest.fn()
}));

// outros serviços/úteis
jest.mock('../../services/seller-subscription.service', () => ({
    createSubscription: jest.fn()
}));

jest.mock('../../services/seller-subaccount.service', () => ({
    create: jest.fn(),
}));

jest.mock('../../utils/subscription-validator', () => ({
    checkSubscriptionMiddleware: jest.fn().mockResolvedValue(null)
}));

// Imports após mocks
const SellerService = require('../../services/seller.service');
const Seller = require('../../models/Seller');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const Shopper = require('../../models/Shopper');
const SellerSubscription = require('../../models/SellerSubscription');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const SellerSubscriptionService = require('../../services/seller-subscription.service');
const SellerSubAccountService = require('../../services/seller-subaccount.service');
const { createError, formatError } = require('../../utils/errorHandler');
const PaymentMethodsValidator = require('../../validators/payment-methods-validator');
const SellerValidator = require('../../validators/seller-validator');
const AsaasMapper = require('../../utils/asaas-mapper');
const sequelize = require('../../config/database');
const { checkSubscriptionMiddleware } = require('../../utils/subscription-validator');

describe('SellerService - suíte consolidada (um arquivo por assunto)', () => {
    const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        // Configurar mocks que precisam ser resetados a cada teste
        sequelize.transaction.mockImplementation(async (cb) => {
            return cb ? cb(mockTransaction) : mockTransaction;
        });
    });

    test('create: erro na sincronização com Asaas deve fazer rollback', async () => {
        const data = {
            email: 'seller@example.com',
            name: 'Test Seller',
            cpf_cnpj: '12345678901', // CPF
            // birth_date está faltando, o que deve causar o erro
            nuvemshop_id: 123456,
            nuvemshop_info: { storeName: 'My Store' },
            nuvemshop_api_token: 'token123'
        };

        // Mocks de validação e checagem de duplicidade
        SellerValidator.validateSellerData.mockImplementation(() => { });
        Seller.findOne.mockResolvedValue(null);
        UserData.findOne.mockResolvedValue(null);

        // Mocks para criação de entidades locais
        const mockUserData = { id: 1, ...data };
        const mockUser = { id: 1, email: data.email, user_data_id: 1 };
        const mockSeller = { id: 1, nuvemshop_id: data.nuvemshop_id, user_id: 1, update: jest.fn() };
        UserData.create.mockResolvedValue(mockUserData);
        User.create.mockResolvedValue(mockUser);
        Seller.create.mockResolvedValue(mockSeller);

        // Mock para a criação da subconta Asaas falhar
        const subAccountError = new Error('Data de nascimento é obrigatória para CPF.');
        SellerSubAccountService.create.mockRejectedValue(subAccountError);

        const res = await SellerService.create(data);

        expect(res.success).toBe(false);
        expect(res.message).toBe('Erro ao criar vendedor e subconta: Data de nascimento é obrigatória para CPF.');

        // Verifica se a transação foi usada e revertida
        expect(sequelize.transaction).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
        expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    test('cria seller e subconta com sucesso', async () => {
        const data = {
            email: 'seller@example.com',
            name: 'Test Seller',
            cpf_cnpj: '12345678901',
            birth_date: '1990-01-01',
            company_type: 'MEI',
            income_value: 10000,
            nuvemshop_id: 123456,
            nuvemshop_info: { storeName: 'My Store' },
            nuvemshop_api_token: 'token123'
        };

        // Mocks de validação e checagem de duplicidade
        SellerValidator.validateSellerData.mockImplementation(() => { });
        Seller.findOne.mockResolvedValue(null);
        UserData.findOne.mockResolvedValue(null);

        // Mocks para criação de entidades locais
        const mockUserData = { id: 1, ...data };
        const mockUser = { id: 1, email: data.email, user_data_id: 1 };
        const mockSeller = { id: 1, nuvemshop_id: data.nuvemshop_id, user_id: 1, update: jest.fn() };
        UserData.create.mockResolvedValue(mockUserData);
        User.create.mockResolvedValue(mockUser);
        Seller.create.mockResolvedValue(mockSeller);

        // Mock para a criação da subconta Asaas
        const subAccountResponse = {
            success: true,
            data: {
                id: 'subaccount_123',
                apiKey: 'key_123',
                walletId: 'wallet_123'
            }
        };
        SellerSubAccountService.create.mockResolvedValue(subAccountResponse);

        // Mock para o findByPk que retorna o seller completo com as relações
        const sellerWithRelations = {
            ...mockSeller,
            user: {
                ...mockUser,
                userData: mockUserData
            },
            toJSON: () => ({ ...mockSeller, user: { ...mockUser, userData: mockUserData } })
        };
        Seller.findByPk.mockResolvedValue(sellerWithRelations);

        const res = await SellerService.create(data);

        expect(res.success).toBe(true);
        expect(res.data).toBeDefined();
        expect(res.data.id).toBe(mockSeller.id);

        // Verifica se a transação foi usada
        expect(sequelize.transaction).toHaveBeenCalled();
        expect(UserData.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });
        expect(User.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });
        expect(Seller.create).toHaveBeenCalledWith(expect.any(Object), { transaction: mockTransaction });

        // Verifica a chamada ao serviço de subconta
        expect(SellerSubAccountService.create).toHaveBeenCalledWith(expect.any(Object), mockTransaction);

        // Verifica se o seller local foi atualizado com os dados da subconta
        expect(mockSeller.update).toHaveBeenCalledWith({
            subaccount_id: subAccountResponse.data.id,
            asaas_api_key: subAccountResponse.data.apiKey,
            wallet_id: subAccountResponse.data.walletId
        }, { transaction: mockTransaction });

        // Verifica se a transação foi commitada
        expect(mockTransaction.commit).toHaveBeenCalled();
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    test('detecta duplicação de nuvemshop_id', async () => {
        const data = { nuvemshop_id: 123456, email: 'x@x.com', cpfCnpj: '123' };
        require('../../validators/seller-validator').validateSellerData.mockImplementation(() => { });

        // Resetar completamente e configurar mock específico para este teste
        Seller.findOne.mockReset();
        Seller.findOne.mockResolvedValueOnce({ id: 5, nuvemshop_id: 123456 });

        const res = await SellerService.create(data);
        expect(res.success).toBe(false);
        expect(res.message).toMatch(/Já existe um vendedor com este ID da Nuvemshop/);
    });

    test('detecta duplicação: cpfCnpj já vinculado a outro seller', async () => {
        const data = { nuvemshop_id: 123, email: 'x@x.com', cpfCnpj: '111' };
        require('../../validators/seller-validator').validateSellerData.mockImplementation(() => { });
        Seller.findOne.mockResolvedValueOnce(null); // por nuvemshop_id
        const ud = { id: 2, cpfCnpj: '111' };
        const usr = { id: 3, user_data_id: 2 };
        const existingSeller = { id: 10, user_id: 3 };
        UserData.findOne.mockResolvedValue(ud);
        User.findOne.mockResolvedValue(usr);
        Seller.findOne.mockResolvedValueOnce(existingSeller);
        createError.mockReturnValue({ success: false, message: 'Já existe um vendedor associado', code: 400 });

        const res = await SellerService.create(data);
        expect(res.success).toBe(false);
        expect(res.code).toBe(400);
    });

    test('delete: exclui seller/user/userData quando não há vínculos', async () => {
        const user = { id: 1, user_data_id: 1, destroy: jest.fn().mockResolvedValue({}) };
        const ud = { id: 1, destroy: jest.fn().mockResolvedValue({}) };
        const seller = { id: 1, user, destroy: jest.fn().mockResolvedValue({}) };
        require('../../validators/seller-validator').validateId.mockImplementation(() => { });
        Seller.findByPk.mockResolvedValue(seller);
        Shopper.count.mockResolvedValue(0);
        Seller.count.mockResolvedValue(0);
        User.count.mockResolvedValue(0);
        User.findByPk.mockResolvedValue(user);
        UserData.findByPk.mockResolvedValue(ud);

        const res = await SellerService.delete(1);
        expect(res.success).toBe(true);
        expect(user.destroy).toHaveBeenCalled();
        expect(ud.destroy).toHaveBeenCalled();
    });

    test('delete: mantém user quando vinculado a shopper', async () => {
        const user = { id: 1, user_data_id: 1, destroy: jest.fn() };
        const seller = { id: 1, user, destroy: jest.fn() };
        require('../../validators/seller-validator').validateId.mockImplementation(() => { });
        Seller.findByPk.mockResolvedValue(seller);
        Shopper.count.mockResolvedValue(1);
        Seller.count.mockResolvedValue(0);

        const res = await SellerService.delete(1);
        expect(res.success).toBe(true);
        expect(user.destroy).not.toHaveBeenCalled();
    });

    test('updatePaymentMethods: sucesso', async () => {
        const seller = { id: 1, accepted_payment_methods: ['credit_card'], save: jest.fn() };
        require('../../validators/seller-validator').validateId.mockImplementation(() => { });
        Seller.findByPk.mockResolvedValue(seller);
        PaymentMethodsValidator.validatePaymentMethods.mockImplementation(() => { });

        const res = await SellerService.updatePaymentMethods(1, ['credit_card', 'pix']);
        expect(res.success).toBe(true);
        expect(seller.accepted_payment_methods).toEqual(['credit_card', 'pix']);
    });

    test('addPaymentMethod: sucesso', async () => {
        const seller = { id: 1, save: jest.fn(), isPaymentMethodAccepted: jest.fn().mockReturnValue(false), addPaymentMethod: jest.fn() };
        require('../../validators/seller-validator').validateId.mockImplementation(() => { });
        Seller.findByPk.mockResolvedValue(seller);
        PaymentMethodsValidator.validateSinglePaymentMethod.mockImplementation(() => { });

        const res = await SellerService.addPaymentMethod(1, 'boleto');
        expect(res.success).toBe(true);
        expect(seller.addPaymentMethod).toHaveBeenCalledWith('boleto');
    });

    test('removePaymentMethod: sucesso', async () => {
        const seller = { id: 1, save: jest.fn(), isPaymentMethodAccepted: jest.fn().mockReturnValue(true), removePaymentMethod: jest.fn() };
        require('../../validators/seller-validator').validateId.mockImplementation(() => { });
        Seller.findByPk.mockResolvedValue(seller);
        PaymentMethodsValidator.validateSinglePaymentMethod.mockImplementation(() => { });

        const res = await SellerService.removePaymentMethod(1, 'pix');
        expect(res.success).toBe(true);
        expect(seller.removePaymentMethod).toHaveBeenCalledWith('pix');
    });

    describe('getAll', () => {
        test('sucesso', async () => {
            Seller.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
            const res = await SellerService.getAll();
            expect(res.success).toBe(true);
            expect(res.data).toHaveLength(2);
        });

        test('erro', async () => {
            Seller.findAll.mockRejectedValue(new Error('Erro de conexão'));
            const res = await SellerService.getAll();
            expect(res.success).toBe(false);
            expect(res.message).toBe('Erro de conexão');
        });
    });

    describe('erros de validação simples', () => {
        test('get: validação ID inválido', async () => {
            require('../../validators/seller-validator').validateId.mockImplementation(() => { throw new Error('ID inválido'); });
            const res = await SellerService.get('invalid');
            expect(res.success).toBe(false);
            expect(res.message).toBe('ID inválido');
        });

        test('getByNuvemshopId: erro inesperado', async () => {
            require('../../validators/seller-validator').validateNuvemshopId.mockImplementation(() => {
                throw new Error('Nuvemshop ID inválido');
            });
            Seller.findOne.mockReset(); // Reset para evitar interferência
            const res = await SellerService.getByNuvemshopId(123);
            expect(res.success).toBe(false);
            expect(res.message).toBe('Nuvemshop ID inválido');
        });
    });

    describe('update', () => {
        test('sucesso', async () => {
            const seller = { id: 1, user: { userData: {}, update: jest.fn() }, update: jest.fn(), reload: jest.fn(), toJSON: jest.fn().mockReturnValue({ id: 1 }) };
            require('../../validators/seller-validator').validateId.mockImplementation(() => { });
            require('../../validators/seller-validator').validateSellerUpdateData.mockImplementation(() => { });
            Seller.findByPk.mockResolvedValue(seller);
            const res = await SellerService.update(1, { nuvemshop_info: { test: true } });
            expect(res.success).toBe(true);
            expect(seller.update).toHaveBeenCalled();
        });

        test('não encontrado', async () => {
            require('../../validators/seller-validator').validateId.mockImplementation(() => { });
            require('../../validators/seller-validator').validateSellerUpdateData.mockImplementation(() => { });
            Seller.findByPk.mockResolvedValue(null);
            createError.mockImplementation((m, c) => ({ success: false, message: m, code: c }));
            const res = await SellerService.update(999, {});
            expect(res.success).toBe(false);
            expect(res.code).toBe(404);
        });

        test('ID inválido', async () => {
            require('../../validators/seller-validator').validateId.mockImplementation(() => { const e = new Error('ID inválido'); e.code = 400; throw e; });
            formatError.mockImplementation((e) => ({ success: false, message: e.message, code: e.code }));
            const res = await SellerService.update(null, {});
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });
    });

    describe('findByCpfCnpj', () => {
        test('sucesso', async () => {
            const ud = { id: 1 };
            const usr = { id: 2, user_data_id: 1 };
            const seller = { id: 3, user_id: 2 };
            UserData.findOne.mockResolvedValue(ud);
            User.findOne.mockResolvedValue(usr);
            Seller.findOne.mockResolvedValue(seller);
            const res = await SellerService.findByCpfCnpj('123');
            expect(res.success).toBe(true);
            expect(res.data).toEqual(seller);
        });

        test('não encontrado -> null', async () => {
            UserData.findOne.mockResolvedValue(null);
            const res = await SellerService.findByCpfCnpj('999');
            expect(res.success).toBe(true);
            expect(res.data).toBe(null);
        });

        test('cpf/ cnpj não informado', async () => {
            createError.mockImplementation((m, c) => ({ success: false, message: m, code: c }));
            const res = await SellerService.findByCpfCnpj();
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });
    });

    describe('updateStoreInfo', () => {
        test('sucesso', async () => {
            const seller = { id: 1, nuvemshop_id: 123, save: jest.fn(), user: { update: jest.fn() } };
            Seller.findOne.mockResolvedValue(seller);
            Seller.findByPk.mockResolvedValue(seller);
            SellerSubscription.findOne.mockResolvedValue(null);
            const res = await SellerService.updateStoreInfo(123, { email: 'new@test.com', name: { pt: 'Nova Loja' } });
            expect(res.success).toBe(true);
            expect(seller.save).toHaveBeenCalled();
        });

        test('não encontrado', async () => {
            Seller.findOne.mockResolvedValue(null);
            createError.mockImplementation((m, c) => ({ success: false, message: m, code: c }));
            const res = await SellerService.updateStoreInfo(999, { email: 'x' });
            expect(res.success).toBe(false);
            expect(res.code).toBe(404);
        });
    });

    describe('getByStoreId', () => {
        test('sucesso', async () => {
            Seller.findOne.mockResolvedValue({ id: 1, nuvemshop_id: 123 });
            const res = await SellerService.getByStoreId('123');
            expect(res.success).toBe(true);
            expect(res.data.id).toBe(1);
        });

        test('erro 404', async () => {
            Seller.findOne.mockResolvedValue(null);
            createError.mockImplementation((m, c) => ({ success: false, message: m, code: c }));
            const res = await SellerService.getByStoreId('999');
            expect(res.success).toBe(false);
            expect(res.code).toBe(404);
        });
    });

    describe('fluxos adicionais', () => {
        test('syncWithAsaas: sucesso', async () => {
            Seller.findByPk.mockResolvedValue({ id: 1, user: { userData: { cpfCnpj: '123' } } });
            AsaasMapper.mapSellerToCustomer.mockReturnValue({ name: 'Test', cpfCnpj: '123' });
            AsaasCustomerService.createOrUpdate.mockResolvedValue({ success: true, data: { id: 'cus_1' } });
            const res = await SellerService.syncWithAsaas(1);
            expect(res.success).toBe(true);
        });

        test('savePaymentsInfo: sucesso mínimo', async () => {
            Seller.upsert.mockResolvedValue([{ dataValues: { id: 1 } }, true]);
            const res = await SellerService.savePaymentsInfo('store123', { customer: 'cus_1', id: 'sub_1', status: 'active', nextDueDate: '2025-01-01' });
            expect(res.success).toBe(true);
        });

        test('saveSubAccountInfo: sucesso', async () => {
            const seller = { id: 1, user: { userData: { update: jest.fn() }, update: jest.fn() }, update: jest.fn(), reload: jest.fn() };
            Seller.findOne.mockResolvedValue(seller);
            const res = await SellerService.saveSubAccountInfo('store123', { id: 'acc', walletId: 'w', apiKey: 'k', cpfCnpj: '123' });
            expect(res.success).toBe(true);
        });
    });

    // Blocos do antigo seller.service.more.test.js (ramos de erro) - simplificados
    describe('ramos de erro (consolidados do arquivo more)', () => {
        test('ensureSellerExistsFromOAuth: 400 quando id ausente', async () => {
            const res = await SellerService.ensureSellerExistsFromOAuth(null, {});
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });

        test('saveSubAccountInfo: 404 quando seller não encontrado', async () => {
            Seller.findOne.mockResolvedValue(null);
            const res = await SellerService.saveSubAccountInfo('storeX', {});
            expect(res.success).toBe(false);
            expect(res.code).toBe(404);
        });

        test('savePaymentsInfo: 400 quando storeId ausente', async () => {
            const res = await SellerService.savePaymentsInfo('', {});
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });

        test('addPaymentMethod: 400 quando já aceito', async () => {
            Seller.findByPk.mockResolvedValue({ id: 1, accepted_payment_methods: ['pix'], isPaymentMethodAccepted: jest.fn().mockReturnValue(true) });
            const res = await SellerService.addPaymentMethod(1, 'pix');
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });

        test('removePaymentMethod: 400 quando método não aceito', async () => {
            Seller.findByPk.mockResolvedValue({ id: 2, accepted_payment_methods: ['credit_card'], isPaymentMethodAccepted: jest.fn().mockReturnValue(false) });
            const res = await SellerService.removePaymentMethod(2, 'pix');
            expect(res.success).toBe(false);
            expect(res.code).toBe(400);
        });
    });

    // Testes de createDefaultSubscription
    describe('createDefaultSubscription', () => {
        test('retorna assinatura existente quando já há registro', async () => {
            SellerSubscription.findOne.mockResolvedValue({ id: 99, seller_id: 1 });

            const res = await SellerService.createDefaultSubscription(1);

            expect(res.success).toBe(true);
            expect(res.message).toMatch(/Assinatura já existe/);
            expect(Seller.findByPk).not.toHaveBeenCalled();
        });

        test('retorna erro quando seller não encontrado', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            Seller.findByPk.mockResolvedValue(null);

            const res = await SellerService.createDefaultSubscription(123);

            expect(res.success).toBe(false);
            expect(res.message).toMatch(/Seller com ID 123 não encontrado/);
        });

        test('cria assinatura local pendente quando faltam dados para Asaas', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            const sellerObj = {
                id: 7,
                nuvemshop_id: 777,
                nuvemshop_info: JSON.stringify({}),
                payments_customer_id: null,
                user: { userData: {} },
                save: jest.fn().mockResolvedValue()
            };
            Seller.findByPk.mockResolvedValue(sellerObj);
            SellerSubscription.create.mockResolvedValue({ id: 100, seller_id: 7, status: 'pending' });

            const res = await SellerService.createDefaultSubscription(7);

            expect(res.success).toBe(true);
            expect(res.message).toMatch(/aguardando complemento de dados/);
            expect(res.needsDocuments).toBe(true);
            expect(SellerSubscription.create).toHaveBeenCalledWith(
                expect.objectContaining({ seller_id: 7, status: 'pending' }),
                { transaction: null }
            );
            expect(AsaasCustomerService.createOrUpdate).not.toHaveBeenCalled();
        });

        test('integra com Asaas e cria assinatura no Asaas quando há dados suficientes', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            const sellerObj = {
                id: 9,
                nuvemshop_id: 900,
                nuvemshop_info: JSON.stringify({ name: { pt: 'Loja X' }, email: 'loja@x.com', phone: '11', business_id: '12345678901' }),
                payments_customer_id: null,
                user: { username: 'Loja X', email: 'loja@x.com', userData: { cpfCnpj: '12345678901', mobilePhone: '11' } },
                save: jest.fn().mockResolvedValue()
            };
            Seller.findByPk.mockResolvedValue(sellerObj);

            // Asaas customer creation and validation
            AsaasCustomerService.createOrUpdate.mockResolvedValueOnce({ success: true, data: { id: 'cus_1' } });
            AsaasCustomerService.createOrUpdate.mockResolvedValueOnce({ success: true, data: { id: 'cus_1' } });
            AsaasCustomerService.get.mockResolvedValue({ success: true, data: { cpfCnpj: '12345678901' } });

            // Subscription on Asaas
            SellerSubscriptionService.createSubscription.mockResolvedValue({
                success: true,
                data: { external_id: 'sub_1', asaas_subscription: { id: 'sub_1' } }
            });

            const res = await SellerService.createDefaultSubscription(9);

            expect(res.success).toBe(true);
            expect(res.message).toMatch(/Assinatura padrão criada com sucesso no Asaas/);
            expect(AsaasCustomerService.createOrUpdate).toHaveBeenCalled();
            expect(SellerSubscriptionService.createSubscription).toHaveBeenCalledWith(
                9,
                expect.objectContaining({ plan_name: expect.any(String), value: expect.any(Number), cycle: expect.any(String) }),
                expect.objectContaining({ billingType: 'CREDIT_CARD' }),
                null
            );
        });
    });

    // Testes de métodos utilitários
    describe('métodos utilitários', () => {
        test('ensureSellerExistsFromOAuth retorna existente', async () => {
            const existing = { id: 1, nuvemshop_id: 111 };
            Seller.findOne.mockResolvedValue(existing);

            const res = await SellerService.ensureSellerExistsFromOAuth(111, {});
            expect(res.success).toBe(true);
            expect(res.data).toBe(existing);
            expect(UserData.create).not.toHaveBeenCalled();
        });

        test('ensureSellerExistsFromOAuth cria registros mínimos quando não existe', async () => {
            Seller.findOne.mockResolvedValue(null);
            UserData.create.mockResolvedValue({ id: 5 });
            User.create.mockResolvedValue({ id: 10 });
            Seller.create.mockResolvedValue({ id: 20, nuvemshop_id: 222 });

            const storeInfo = JSON.stringify({ name: { pt: 'Minha Loja' }, email: 'l@x.com' });
            const res = await SellerService.ensureSellerExistsFromOAuth(222, storeInfo, 'tok');

            expect(res.success).toBe(true);
            expect(UserData.create).toHaveBeenCalledWith({});
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'Minha Loja', email: 'l@x.com' }));
            expect(Seller.create).toHaveBeenCalledWith(expect.objectContaining({ nuvemshop_id: 222, nuvemshop_api_token: 'tok' }));
        });

        test('getDefaultSubscriptionConfig retorna estrutura correta', () => {
            const cfg = SellerService.getDefaultSubscriptionConfig(1, 'active');
            expect(cfg).toMatchObject({ seller_id: 1, status: 'active', cycle: 'MONTHLY', value: expect.any(Number) });
        });

        test('calculateNextDueDate avança datas corretamente', () => {
            const start = new Date('2025-01-01T00:00:00Z');
            const nextMonthly = SellerService.calculateNextDueDate(start, 'MONTHLY');
            expect(nextMonthly.getMonth()).not.toBe(start.getMonth());

            const nextYearly = SellerService.calculateNextDueDate(start, 'YEARLY');
            expect(nextYearly.getFullYear()).toBe(start.getFullYear() + 1);
        });
    });

    // Testes específicos de updateSellerDocuments (documentos)
    describe('updateSellerDocuments - integração completa', () => {
        test('atualiza/cria todos os campos do UserData ao completar documentos', async () => {
            const sellerMock = {
                id: 1,
                app_status: 'pending',
                nuvemshop_id: 'ns1',
                nuvemshop_info: JSON.stringify({ email: 's@e.com', name: { pt: 'Loja' } }),
                user: {
                    id: 10,
                    email: 's@e.com',
                    update: jest.fn(),
                    userData: null
                },
                update: jest.fn()
            };

            Seller.findByPk.mockResolvedValue(sellerMock);
            UserData.findOne.mockResolvedValue(null);
            UserData.create.mockResolvedValue({ id: 33, update: jest.fn() });
            AsaasCustomerService.createOrUpdate.mockResolvedValue({ success: true, data: { id: 'cust1' } });
            SellerSubscriptionService.createSubscription.mockResolvedValue({ success: true, data: { asaas_subscription: { id: 'sub1' } } });

            const res = await SellerService.updateSellerDocuments(1, {
                cpfCnpj: '123',
                name: 'Nome',
                phone: '999',
                address: 'Rua',
                addressNumber: '10',
                province: 'SP',
                postalCode: '00000-000',
                birthDate: '2000-01-01'
            });

            expect(UserData.create).toHaveBeenCalledWith(expect.objectContaining({
                cpf_cnpj: '123',
                mobile_phone: '999',
                address: 'Rua',
                address_number: '10',
                province: 'SP',
                postal_code: '00000-000',
                birth_date: '2000-01-01',
                income_value: null,
                company_type: null
            }), expect.any(Object));

            expect(AsaasCustomerService.createOrUpdate).toHaveBeenCalled();
            expect(SellerSubscriptionService.createSubscription).toHaveBeenCalled();
            expect(res.success).toBe(true);
        });
    });

    // Testes específicos de OAuth - UserData
    describe('OAuth - UserData sempre vazio na criação', () => {
        test('ensureSellerExistsFromOAuth cria UserData vazio e vincula ao User', async () => {
            Seller.findOne.mockResolvedValue(null);
            UserData.create.mockResolvedValue({ id: 77 });
            User.create.mockResolvedValue({ id: 42 });
            Seller.create.mockResolvedValue({ id: 9 });

            const storeInfo = JSON.stringify({ name: { pt: 'Loja X' }, email: 'x@y.z' });
            const res = await SellerService.ensureSellerExistsFromOAuth('123', storeInfo, 'tok');

            expect(UserData.create).toHaveBeenCalledWith({});
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ user_data_id: 77 }));
            expect(Seller.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 42 }));
            expect(res.success).toBe(true);
        });
    });

    // Testes para melhorar cobertura - cenários de erro
    describe('Cenários de erro e edge cases', () => {
        test('get: erro na busca do seller', async () => {
            SellerValidator.validateId.mockImplementation(() => { });
            Seller.findByPk.mockRejectedValue(new Error('Database error'));

            const result = await SellerService.get(1);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Database error');
        });

        test('getByNuvemshopId: erro de validação', async () => {
            SellerValidator.validateNuvemshopId.mockImplementation(() => {
                throw new Error('ID inválido');
            });

            const result = await SellerService.getByNuvemshopId('invalid');
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID inválido');
        });

        test('getAll: erro na busca', async () => {
            Seller.findAll.mockRejectedValue(new Error('Connection error'));

            const result = await SellerService.getAll();
            expect(result.success).toBe(false);
            expect(result.message).toBe('Connection error');
        });

        test('delete: seller não encontrado', async () => {
            SellerValidator.validateId.mockImplementation(() => { });
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.delete(999);
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
        });

        test('delete: erro durante exclusão', async () => {
            SellerValidator.validateId.mockImplementation(() => { });
            const mockSeller = {
                id: 1,
                user_id: 1,
                destroy: jest.fn().mockRejectedValue(new Error('Delete error'))
            };
            Seller.findByPk.mockResolvedValue(mockSeller);

            const result = await SellerService.delete(1);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao excluir dados: Delete error');
        });

        test('create: erro na validação dos dados', async () => {
            SellerValidator.validateSellerData.mockImplementation(() => {
                throw new Error('Dados inválidos');
            });
            const result = await SellerService.create({});
            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao criar vendedor e subconta: Dados inválidos');
        });

        test('updateSellerDocuments: seller não encontrado', async () => {
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.updateSellerDocuments(999, { cpfCnpj: '12345678909' });
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
        });

        test('updatePaymentMethods: seller não encontrado', async () => {
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.updatePaymentMethods(999, ['PIX']);
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
        });

        test('addPaymentMethod: seller não encontrado', async () => {
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.addPaymentMethod(999, 'BOLETO');
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
        });

        test('removePaymentMethod: seller não encontrado', async () => {
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.removePaymentMethod(999, 'PIX');
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
        });

        test('findByCpfCnpj: erro na busca', async () => {
            User.findOne.mockRejectedValue(new Error('Search error'));

            const result = await SellerService.findByCpfCnpj('12345678909');
            expect(result.success).toBe(true); // Retorna sucesso com data null
            expect(result.data).toBeNull();
        });

        test('ensureSellerExistsFromOAuth: erro na criação', async () => {
            Seller.findOne.mockResolvedValue(null);
            UserData.create.mockRejectedValue(new Error('Creation error'));

            const result = await SellerService.ensureSellerExistsFromOAuth('123', '{}', 'token');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Creation error');
        });
    });

    // Novos testes para melhorar cobertura acima de 80%
    describe('Novos testes para cobertura adicional', () => {
        test('addPaymentMethod: método já aceito', async () => {
            const seller = {
                id: 1,
                accepted_payment_methods: ['PIX', 'BOLETO'],
                isPaymentMethodAccepted: jest.fn().mockReturnValue(true),
                save: jest.fn()
            };
            Seller.findByPk.mockResolvedValue(seller);

            const result = await SellerService.addPaymentMethod(1, 'PIX');
            expect(result.success).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toContain('já está aceito');
        });

        test('removePaymentMethod: método não aceito', async () => {
            const seller = {
                id: 1,
                accepted_payment_methods: ['PIX'],
                isPaymentMethodAccepted: jest.fn().mockReturnValue(false),
                save: jest.fn()
            };
            Seller.findByPk.mockResolvedValue(seller);

            const result = await SellerService.removePaymentMethod(1, 'BOLETO');
            expect(result.success).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toContain('não está aceito');
        });

        test('getByStoreId: store_id não fornecido', async () => {
            const result = await SellerService.getByStoreId('');
            expect(result.success).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('ID da loja é obrigatório');
        });

        test('getByStoreId: seller encontrado', async () => {
            const seller = { id: 1, nuvemshop_id: '123' };
            Seller.findOne.mockResolvedValue(seller);

            const result = await SellerService.getByStoreId('123');
            expect(result.success).toBe(true);
            expect(result.data).toBe(seller);
        });

        test('getByStoreId: seller não encontrado', async () => {
            Seller.findOne.mockResolvedValue(null);

            const result = await SellerService.getByStoreId('999');
            expect(result.success).toBe(false);
            expect(result.code).toBe(404);
            expect(result.message).toContain('não encontrado');
        });

        test('ensureSellerExistsFromOAuth: seller já existe', async () => {
            const existingSeller = { id: 1, nuvemshop_id: '123' };
            Seller.findOne.mockResolvedValue(existingSeller);

            const result = await SellerService.ensureSellerExistsFromOAuth('123');
            expect(result.success).toBe(true);
            expect(result.data).toBe(existingSeller);
        });

        test('ensureSellerExistsFromOAuth: criação de novo seller com dados válidos', async () => {
            Seller.findOne.mockResolvedValue(null);
            const userData = { id: 1 };
            const user = { id: 1 };
            const seller = { id: 1, nuvemshop_id: '123' };

            UserData.create.mockResolvedValue(userData);
            User.create.mockResolvedValue(user);
            Seller.create.mockResolvedValue(seller);

            const storeInfo = { name: { pt: 'Loja Teste' }, email: 'test@test.com' };
            const result = await SellerService.ensureSellerExistsFromOAuth('123', storeInfo, 'token123');

            expect(result.success).toBe(true);
            expect(result.data).toBe(seller);
            expect(UserData.create).toHaveBeenCalled();
            expect(User.create).toHaveBeenCalledWith({
                username: 'Loja Teste',
                email: 'test@test.com',
                password: null,
                user_data_id: 1
            });
            expect(Seller.create).toHaveBeenCalledWith({
                nuvemshop_id: '123',
                nuvemshop_info: JSON.stringify(storeInfo),
                nuvemshop_api_token: 'token123',
                app_status: 'pending',
                app_start_date: expect.any(Date),
                user_id: 1,
                payments_customer_id: null
            });
        });

        test('createDefaultSubscription: assinatura já existe', async () => {
            const existingSubscription = { id: 1, seller_id: 1 };
            SellerSubscription.findOne.mockResolvedValue(existingSubscription);

            const result = await SellerService.createDefaultSubscription(1);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Assinatura já existe');
            expect(result.data).toBe(existingSubscription);
        });

        test('createDefaultSubscription: seller não encontrado', async () => {
            SellerSubscription.findOne.mockResolvedValue(null);
            Seller.findByPk.mockResolvedValue(null);

            const result = await SellerService.createDefaultSubscription(999);
            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toContain('não encontrado');
        });

        test('addPaymentMethod: accepted_payment_methods é null', async () => {
            const seller = {
                id: 1,
                accepted_payment_methods: null,
                isPaymentMethodAccepted: jest.fn().mockReturnValue(false),
                addPaymentMethod: jest.fn(),
                save: jest.fn()
            };
            Seller.findByPk.mockResolvedValue(seller);

            const result = await SellerService.addPaymentMethod(1, 'PIX');
            expect(result.success).toBe(true);
            expect(seller.accepted_payment_methods).toEqual(['credit_card', 'pix', 'boleto']);
        });

        test('removePaymentMethod: accepted_payment_methods é null', async () => {
            const seller = {
                id: 1,
                accepted_payment_methods: null,
                isPaymentMethodAccepted: jest.fn().mockReturnValue(true),
                removePaymentMethod: jest.fn(),
                save: jest.fn()
            };
            Seller.findByPk.mockResolvedValue(seller);

            const result = await SellerService.removePaymentMethod(1, 'pix');
            expect(result.success).toBe(true);
            expect(seller.accepted_payment_methods).toEqual(['credit_card', 'pix', 'boleto']);
        });

        test('findByCpfCnpj: sem UserData encontrado', async () => {
            UserData.findOne.mockResolvedValue(null);

            const result = await SellerService.findByCpfCnpj('12345678909');
            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
        });

        test('findByCpfCnpj: com UserData mas sem User associado', async () => {
            const userData = { id: 1 };
            UserData.findOne.mockResolvedValue(userData);
            User.findOne.mockResolvedValue(null);

            const result = await SellerService.findByCpfCnpj('12345678909');
            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
        });

        test('syncWithAsaas: seller sem CPF/CNPJ', async () => {
            const seller = {
                id: 1,
                user: {
                    userData: {
                        cpfCnpj: null
                    }
                }
            };
            Seller.findByPk.mockResolvedValue(seller);

            const result = await SellerService.syncWithAsaas(1);
            expect(result.success).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('CPF/CNPJ é obrigatório para sincronizar com Asaas');
        });

        test('syncWithAsaas: sucesso na sincronização', async () => {
            const seller = {
                id: 1,
                user: {
                    userData: {
                        cpfCnpj: '12345678909'
                    }
                }
            };
            Seller.findByPk.mockResolvedValue(seller);

            const AsaasCustomerService = require('../../services/asaas/customer.service');
            AsaasCustomerService.createOrUpdate.mockResolvedValue({
                success: true,
                data: { id: 'cus_123' }
            });

            const result = await SellerService.syncWithAsaas(1);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Sincronização com Asaas realizada com sucesso');
            expect(result.data.id).toBe('cus_123');
        });

        test('syncWithAsaas: erro na sincronização com Asaas', async () => {
            const seller = {
                id: 1,
                user: {
                    userData: {
                        cpfCnpj: '12345678909'
                    }
                }
            };
            Seller.findByPk.mockResolvedValue(seller);

            const AsaasCustomerService = require('../../services/asaas/customer.service');
            AsaasCustomerService.createOrUpdate.mockResolvedValue({
                success: false,
                message: 'Erro no Asaas',
                status: 400
            });

            const result = await SellerService.syncWithAsaas(1);
            expect(result.success).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toContain('Erro ao sincronizar com Asaas: Erro no Asaas');
        });

        test('updatePaymentMethods: métodos vazios usa padrão', async () => {
            const seller = {
                id: 1,
                accepted_payment_methods: [],
                save: jest.fn()
            };
            SellerValidator.validateId.mockImplementation(() => { });
            const checkSubscriptionMiddleware = require('../../utils/subscription-validator').checkSubscriptionMiddleware;
            checkSubscriptionMiddleware.mockResolvedValue(null);
            Seller.findByPk.mockResolvedValue(seller);
            PaymentMethodsValidator.validatePaymentMethods.mockImplementation(() => { });

            const result = await SellerService.updatePaymentMethods(1, []);
            expect(result.success).toBe(true);
            expect(seller.accepted_payment_methods).toEqual(['credit_card', 'pix', 'boleto']);
        });

        test('updatePaymentMethods: erro na validação da assinatura', async () => {
            SellerValidator.validateId.mockImplementation(() => { });
            const checkSubscriptionMiddleware = require('../../utils/subscription-validator').checkSubscriptionMiddleware;
            checkSubscriptionMiddleware.mockResolvedValue({
                success: false,
                message: 'Assinatura expirada',
                code: 403
            });

            const result = await SellerService.updatePaymentMethods(1, ['PIX']);
            expect(result.success).toBe(false);
            expect(result.code).toBe(403);
            expect(result.message).toBe('Assinatura expirada');
        });

        test('delete: erro na contagem de vendedores', async () => {
            const user = { id: 1, destroy: jest.fn() };
            const seller = { id: 1, user_id: 1, destroy: jest.fn() };

            SellerValidator.validateId.mockImplementation(() => { });
            Seller.findByPk.mockResolvedValue(seller);
            User.findByPk.mockResolvedValue(user);

            // Mock da transação
            const mockTransaction = {
                rollback: jest.fn(),
                commit: jest.fn()
            };
            sequelize.transaction.mockImplementation((fn) => fn(mockTransaction));

            // Simular erro durante a exclusão dentro da transação
            seller.destroy.mockRejectedValue(new Error('Database error'));

            const result = await SellerService.delete(1);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Erro ao excluir dados: Database error');
        });

        test('create: erro na sincronização com Asaas', async () => {
            const data = {
                nuvemshop_id: 123,
                email: 'error@test.com',
                cpf_cnpj: '12345678901',
                birth_date: '1990-01-01',
            };
            SellerValidator.validateSellerData.mockImplementation(() => { });
            Seller.findOne.mockResolvedValue(null);
            UserData.findOne.mockResolvedValue(null);
            UserData.create.mockResolvedValue({ id: 1, ...data });
            User.create.mockResolvedValue({ id: 1, email: data.email, user_data_id: 1 });
            const mockSeller = { id: 1, nuvemshop_id: data.nuvemshop_id, user_id: 1, update: jest.fn() };
            Seller.create.mockResolvedValue(mockSeller);
            Seller.findByPk.mockResolvedValue(mockSeller); // Garante que o findByPk retorne um objeto com update
            SellerSubAccountService.create.mockRejectedValue(new Error('Erro no Asaas'));

            const result = await SellerService.create(data);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao criar vendedor e subconta: Erro no Asaas');
        });
    });
});
