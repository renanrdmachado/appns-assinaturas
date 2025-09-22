// Mocks dos módulos e dependências
jest.mock('../../../models/Seller', () => {
    const mockSeller = function () {
        return {
            update: jest.fn().mockImplementation(function (data) {
                Object.assign(this, data);
                return Promise.resolve(this);
            })
        };
    };
    mockSeller.findByPk = jest.fn();
    mockSeller.findAll = jest.fn();
    mockSeller.update = jest.fn();
    return mockSeller;
}, { virtual: true });

jest.mock('../../../models/User', () => {
    return jest.fn().mockImplementation(() => ({
        userData: {
            name: 'Nome Test',
            document: '12345678901',
            phone: '11999999999'
        }
    }));
}, { virtual: true });

jest.mock('../../../models/UserData', () => {
    return jest.fn().mockImplementation(() => ({}));
}, { virtual: true });

jest.mock('../../../services/asaas/subaccount.service', () => ({
    addSubAccount: jest.fn(),
    getSubAccountByCpfCnpj: jest.fn()
}));

jest.mock('../../../validators/seller-validator', () => ({
    validateId: jest.fn()
}), { virtual: true });

// Mock do formatError e createError
jest.mock('../../../utils/errorHandler', () => ({
    formatError: jest.fn((error) => ({
        success: false,
        message: error.message || 'Erro desconhecido',
        status: error.status || 500
    })),
    createError: jest.fn((message, status) => ({
        success: false,
        message,
        status
    }))
}));

// Importações reais
const SellerSubAccountService = require('../../../services/seller-subaccount.service');
const subAccountService = require('../../../services/asaas/subaccount.service');
const { formatError, createError } = require('../../../utils/errorHandler');
const Seller = require('../../../models/Seller');
const SellerValidator = require('../../../validators/seller-validator');

describe('SellerSubAccountService', () => {
    // Reset dos mocks antes de cada teste
    beforeEach(() => {
        jest.clearAllMocks();
        // Definições padrão para evitar valores undefined em caminhos não configurados explicitamente pelo teste
        Seller.findAll.mockResolvedValue([]); // Evita erro "sellers is not iterable" quando não configurado
        Seller.findByPk.mockResolvedValue(null); // Comportamento neutro (seller não encontrado) a ser sobrescrito pelos testes
        subAccountService.getSubAccountByCpfCnpj.mockResolvedValue(null); // Padrão: nenhuma subconta encontrada, sobrescrito quando necessário
    });

    describe('create', () => {
        test('deve lançar erro quando seller não é fornecido', async () => {
            // Arrange
            const transaction = { commit: jest.fn(), rollback: jest.fn() };

            // Act
            const result = await SellerSubAccountService.create(null, transaction);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Objeto de vendedor inválido fornecido.');
            expect(subAccountService.addSubAccount).not.toHaveBeenCalled();
        });

        test('deve retornar sucesso quando seller já possui subconta', async () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                subaccount_id: 'sub_abc123', // já tem uma subconta
                subaccount_api_key: 'api_key_123',
                subaccount_wallet_id: 'wallet_123',
                email: 'loja@example.com',
                update: jest.fn()
            };
            const transaction = { commit: jest.fn(), rollback: jest.fn() };

            // Act
            const result = await SellerSubAccountService.create(seller, transaction);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data.id).toBe('sub_abc123');
            expect(result.data.apiKey).toBe('api_key_123');
            expect(result.data.walletId).toBe('wallet_123');
            expect(subAccountService.addSubAccount).not.toHaveBeenCalled();
        });

        test('deve criar uma subconta com sucesso', async () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                subaccount_id: null,
                email: 'loja@example.com',
                phone: '11999999999',
                document: '12345678901',
                user: {
                    name: 'Usuario Test',
                    email: 'usuario@example.com',
                    userData: {
                        name: 'Nome Completo',
                        cpf_cnpj: '12345678901',
                        phone: '11999999999',
                        address: 'Rua Teste',
                        city: 'São Paulo',
                        state: 'SP',
                        postal_code: '01234567'
                    }
                },
                update: jest.fn().mockResolvedValue(true)
            };
            const transaction = { commit: jest.fn(), rollback: jest.fn() };

            const mockSubAccountResponse = {
                success: true,
                data: {
                    id: 'sub_xyz789',
                    apiKey: 'api_key_123',
                    walletId: 'wallet_123'
                }
            };

            // Spy no método formatDataForAsaasSubAccount
            const originalMethod = SellerSubAccountService.formatDataForAsaasSubAccount;
            SellerSubAccountService.formatDataForAsaasSubAccount = jest.fn().mockReturnValue({
                name: 'Loja Test',
                email: 'loja@example.com',
                cpfCnpj: '12345678901',
                companyType: 'INDIVIDUAL',
                mobilePhone: '11999999999'
            });

            // Mock para getSubAccountByCpfCnpj - deve retornar que não existe subconta
            subAccountService.getSubAccountByCpfCnpj.mockResolvedValue({
                success: false,
                data: null
            });

            subAccountService.addSubAccount.mockResolvedValue(mockSubAccountResponse);

            try {
                // Act
                const result = await SellerSubAccountService.create(seller, transaction);

                // Assert
                expect(SellerSubAccountService.formatDataForAsaasSubAccount).toHaveBeenCalledWith(seller);
                expect(subAccountService.addSubAccount).toHaveBeenCalled();

                expect(result.success).toBe(true);
                expect(result.data).toBeDefined();
                expect(result.data.id).toBe('sub_xyz789');
            } finally {
                // Restaurar o método original
                SellerSubAccountService.formatDataForAsaasSubAccount = originalMethod;
            }
        });

        test('deve retornar erro e registrar debug quando a API Asaas falha', async () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                subaccount_id: null,
                email: 'loja@example.com',
                user: {
                    name: 'Usuario Test',
                    email: 'usuario@example.com',
                    userData: {
                        name: 'Nome Completo',
                        cpf_cnpj: '12345678901',
                        phone: '11999999999'
                    }
                },
                update: jest.fn()
            };
            const transaction = { commit: jest.fn(), rollback: jest.fn() };

            const mockErrorResponse = {
                success: false,
                errors: [{ description: 'API Error' }]
            };

            // Spy no método formatDataForAsaasSubAccount
            const originalMethod = SellerSubAccountService.formatDataForAsaasSubAccount;
            SellerSubAccountService.formatDataForAsaasSubAccount = jest.fn().mockReturnValue({
                name: 'Loja Test',
                email: 'loja@example.com',
                cpfCnpj: '12345678901'
            });

            // Mock para getSubAccountByCpfCnpj - deve retornar que não existe subconta
            subAccountService.getSubAccountByCpfCnpj.mockResolvedValue({
                success: false,
                data: null
            });

            subAccountService.addSubAccount.mockResolvedValue(mockErrorResponse);

            try {
                // Act
                const result = await SellerSubAccountService.create(seller, transaction);

                // Assert
                expect(result.success).toBe(false);
                expect(result.message).toBe('Erro desconhecido ao criar subconta no Asaas.');
                expect(SellerSubAccountService.formatDataForAsaasSubAccount).toHaveBeenCalledWith(seller);
                expect(subAccountService.addSubAccount).toHaveBeenCalled();
                // Agora o serviço registra _subaccount_debug no seller mesmo em falha
                expect(seller.update).toHaveBeenCalled();
            } finally {
                // Restaurar o método original
                SellerSubAccountService.formatDataForAsaasSubAccount = originalMethod;
            }
        });

        test('deve lançar exceção durante o processo', async () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                subaccount_id: null,
                email: 'loja@example.com',
                user: {
                    name: 'Usuario Test',
                    email: 'usuario@example.com',
                    userData: {
                        name: 'Nome Completo',
                        cpf_cnpj: '12345678901',
                        phone: '11999999999'
                    }
                }
            };
            const transaction = { commit: jest.fn(), rollback: jest.fn() };

            // Spy no método formatDataForAsaasSubAccount
            const originalMethod = SellerSubAccountService.formatDataForAsaasSubAccount;
            SellerSubAccountService.formatDataForAsaasSubAccount = jest.fn().mockReturnValue({
                name: 'Loja Test',
                email: 'loja@example.com',
                cpfCnpj: '12345678901'
            });

            // Mock para getSubAccountByCpfCnpj - deve retornar que não existe subconta
            subAccountService.getSubAccountByCpfCnpj.mockResolvedValue({
                success: false,
                data: null
            });

            const mockError = new Error('Falha na conexão');
            subAccountService.addSubAccount.mockRejectedValue(mockError);

            try {
                // Act
                const result = await SellerSubAccountService.create(seller, transaction);

                // Assert
                expect(result.success).toBe(false);
                expect(result.message).toBe('Falha na conexão');
                expect(SellerSubAccountService.formatDataForAsaasSubAccount).toHaveBeenCalledWith(seller);
                expect(subAccountService.addSubAccount).toHaveBeenCalled();
            } finally {
                // Restaurar o método original
                SellerSubAccountService.formatDataForAsaasSubAccount = originalMethod;
            }
        });
    });

    describe('getBySellerId', () => {
        test('deve retornar erro quando o ID é inválido', async () => {
            // Arrange
            SellerValidator.validateId.mockImplementation(() => {
                throw new Error('ID inválido');
            });

            formatError.mockReturnValue({
                success: false,
                message: 'ID inválido',
                status: 400
            });

            // Act
            const result = await SellerSubAccountService.getBySellerId(null);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('ID inválido');
        });

        test('deve retornar erro quando o seller não é encontrado', async () => {
            // Arrange
            SellerValidator.validateId.mockReturnValue(true);
            Seller.findByPk.mockResolvedValue(null);

            createError.mockReturnValue({
                success: false,
                message: 'Vendedor não encontrado',
                status: 404
            });

            // Act
            const result = await SellerSubAccountService.getBySellerId(999);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Vendedor não encontrado');
        });

        test('deve retornar erro quando o seller não tem subconta', async () => {
            // Arrange
            SellerValidator.validateId.mockReturnValue(true);
            Seller.findByPk.mockResolvedValue({
                id: 1,
                name: 'Loja Test',
                subaccount_id: null
            });

            createError.mockReturnValue({
                success: false,
                message: 'Vendedor não possui uma subconta associada',
                status: 404
            });

            // Act
            const result = await SellerSubAccountService.getBySellerId(1);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Vendedor não possui uma subconta');
        });

        test('deve retornar os dados da subconta com sucesso', async () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                subaccount_id: 'sub_abc123',
                Asaas_cpfCnpj: '12345678901',
                subaccount_api_key: 'api_key_123',
                subaccount_wallet_id: 'wallet_123'
            };

            const subaccountData = {
                id: 'sub_abc123',
                name: 'Loja Test',
                walletId: 'wallet_123'
            };

            SellerValidator.validateId.mockReturnValue(true);
            Seller.findByPk.mockResolvedValue(seller);
            // O service considera qualquer valor "truthy" retornado como subconta (não exige { success, data })
            // portanto retornamos diretamente o objeto da subconta.
            subAccountService.getSubAccountByCpfCnpj.mockResolvedValue(subaccountData);

            // Act
            const result = await SellerSubAccountService.getBySellerId(1);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.seller).toBe(seller);
            expect(result.data.subaccount).toBe(subaccountData);
        });
    });

    describe('getAll', () => {
        test('deve retornar lista vazia quando não há sellers com subcontas', async () => {
            // Arrange
            Seller.findAll.mockResolvedValue([]);

            // Act
            const result = await SellerSubAccountService.getAll();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });

        test('deve retornar lista de sellers com suas subcontas', async () => {
            // Arrange
            const sellers = [
                {
                    id: 1,
                    name: 'Loja 1',
                    subaccount_id: 'sub_123',
                    Asaas_cpfCnpj: '12345678901'
                },
                {
                    id: 2,
                    name: 'Loja 2',
                    subaccount_id: 'sub_456',
                    Asaas_cpfCnpj: '98765432109'
                }
            ];

            const subaccountData1 = { id: 'sub_123', name: 'Loja 1' };
            const subaccountData2 = { id: 'sub_456', name: 'Loja 2' };

            Seller.findAll.mockResolvedValue(sellers);
            // Similar ao teste anterior, retornamos diretamente os objetos de subconta.
            subAccountService.getSubAccountByCpfCnpj
                .mockResolvedValueOnce(subaccountData1)
                .mockResolvedValueOnce(subaccountData2);

            // Act
            const result = await SellerSubAccountService.getAll();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].seller).toBe(sellers[0]);
            expect(result.data[0].subaccount).toBe(subaccountData1);
            expect(result.data[1].seller).toBe(sellers[1]);
            expect(result.data[1].subaccount).toBe(subaccountData2);
        });

        test('deve lidar com erro ao buscar subcontas', async () => {
            // Arrange
            Seller.findAll.mockRejectedValue(new Error('Erro ao buscar vendedores'));

            formatError.mockReturnValue({
                success: false,
                message: 'Erro ao buscar vendedores',
                status: 500
            });

            // Act
            const result = await SellerSubAccountService.getAll();

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toBe('Erro ao buscar vendedores');
        });
    });
});