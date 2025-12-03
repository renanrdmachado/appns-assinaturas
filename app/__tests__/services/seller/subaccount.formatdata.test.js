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

    test('deve formatar dados corretamente com city como campo separado', () => {
        const result = service.formatDataForAsaasSubAccount(seller);

        expect(result).toHaveProperty('province', 'SP');
        expect(result).toHaveProperty('city', 'São Paulo');
        expect(result.province).not.toBe(result.city);
    });

    test('deve lançar erro quando city está faltando', () => {
        seller.user.userData.city = undefined;

        expect(() => {
            service.formatDataForAsaasSubAccount(seller);
        }).toThrow('Cidade é obrigatória para criar subconta');
    });

    test('deve lançar erro quando CPF/CNPJ está faltando', () => {
        seller.user.userData.cpf_cnpj = undefined;

        expect(() => {
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