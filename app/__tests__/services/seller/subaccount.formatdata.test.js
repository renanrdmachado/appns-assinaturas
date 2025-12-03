// Mocks dos módulos e dependências
jest.mock('../../../models/Seller', () => {
    const mockSeller = function () { };
    mockSeller.prototype.isPaymentMethodAccepted = jest.fn();
    mockSeller.findByPk = jest.fn();
    return mockSeller;
}, { virtual: true });

jest.mock('../../../utils/errorHandler', () => ({
    formatError: jest.fn(),
    // Retorna um Error real para que o toThrow funcione corretamente
    createError: jest.fn((message) => new Error(message))
}));

// Importando o serviço que será testado
const SellerSubAccountService = require('../../../services/seller-subaccount.service');

describe('SellerSubAccountService - formatDataForAsaasSubAccount', () => {
    let service;
    let mockDataProvider;
    let seller;

    beforeEach(() => {
        service = require('../../../services/seller-subaccount.service');

        // Mock seller with complete user and userData
        seller = {
            id: 1,
            user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                userData: {
                    name: 'Teste Silva',
                    email: 'test@example.com',
                    cpf_cnpj: '12345678901',
                    company_type: 'PERSON',
                    phone: '1133334444',
                    mobile_phone: '11999999999',
                    address: 'Rua Teste',
                    address_number: '123',
                    complement: 'Apt 456',
                    province: 'SP',
                    city: 'São Paulo',
                    postal_code: '01310100',
                    birth_date: '1990-01-01',
                    income_value: 5000
                }
            }
        };
    });
    test('deve formatar dados corretamente para o Asaas', () => {
        const result = service.formatDataForAsaasSubAccount(seller);

        expect(result).toHaveProperty('province', 'SP');
        expect(result).toHaveProperty('cpfCnpj', '12345678901');
        expect(result).toHaveProperty('mobilePhone', '11999999999');
    });

    test('deve lançar erro quando CPF/CNPJ está faltando', () => {
    }); test('deve lançar erro quando CPF/CNPJ está faltando', () => {
        seller.user.userData.cpf_cnpj = undefined; expect(() => {
            service.formatDataForAsaasSubAccount(seller);
        }).toThrow('CPF/CNPJ é obrigatório para criar subconta');
    });

    test('deve lançar erro quando mobile_phone está faltando', () => {
        seller.user.userData.mobile_phone = undefined;
        seller.user.userData.phone = undefined; // phone também não deve ser usado como fallback

        expect(() => {
            service.formatDataForAsaasSubAccount(seller);
        }).toThrow('Telefone celular é obrigatório para criar subconta');
    });

    test('deve lançar erro quando income_value está faltando', () => {
        seller.user.userData.income_value = undefined;

        expect(() => {
            service.formatDataForAsaasSubAccount(seller);
        }).toThrow('Valor de renda é obrigatório para criar subconta');
    });

    test('deve lançar erro quando dados insuficientes', () => {
        expect(() => {
            service.formatDataForAsaasSubAccount({});
        }).toThrow('Dados insuficientes para formatar para o Asaas');
    });
});