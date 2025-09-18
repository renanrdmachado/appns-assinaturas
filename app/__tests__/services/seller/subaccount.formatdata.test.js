// Mocks dos módulos e dependências
jest.mock('../../../models/Seller', () => {
    const mockSeller = function () { };
    mockSeller.prototype.isPaymentMethodAccepted = jest.fn();
    mockSeller.findByPk = jest.fn();
    return mockSeller;
}, { virtual: true });

jest.mock('../../../utils/errorHandler', () => ({
    formatError: jest.fn(),
    createError: jest.fn()
}));

// Importando o serviço que será testado
const SellerSubAccountService = require('../../../services/seller-subaccount.service');

describe('SellerSubAccountService', () => {
    describe('formatDataForAsaasSubAccount', () => {
        test('deve formatar os dados do vendedor corretamente', () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                email: 'loja@example.com',
                user: {
                    name: 'Usuario Test',
                    email: 'usuario@example.com',
                    userData: {
                        name: 'Nome Completo',
                        cpf_cnpj: '12345678901',
                        phone: '11999999999',
                        mobile_phone: '11988888888',
                        address: 'Rua Teste',
                        address_number: '123',
                        complement: 'Apto 45',
                        province: 'Centro',
                        city: 'São Paulo',
                        state: 'SP',
                        postal_code: '01234567',
                        birth_date: '1990-01-01',
                        income_value: 5000
                    }
                }
            };

            // Act
            const result = SellerSubAccountService.formatDataForAsaasSubAccount(seller);

            // Assert
            expect(result).toMatchObject({
                name: seller.user.userData.name,
                email: seller.user.email,
                cpfCnpj: seller.user.userData.cpf_cnpj,
                phone: seller.user.userData.phone,
                mobilePhone: seller.user.userData.mobile_phone,
                address: seller.user.userData.address,
                addressNumber: seller.user.userData.address_number,
                complement: seller.user.userData.complement,
                province: seller.user.userData.province,
                postalCode: seller.user.userData.postal_code,
                birthDate: seller.user.userData.birth_date,
                incomeValue: seller.user.userData.income_value
            });
        });

        test('deve lançar erro quando dados insuficientes', () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                email: 'loja@example.com'
                // sem user e userData
            };

            // Act & Assert
            expect(() => {
                SellerSubAccountService.formatDataForAsaasSubAccount(seller);
            }).toThrow('Dados insuficientes para formatar para o Asaas. Relações `user` e `userData` são necessárias.');
        });

        test('deve usar valores alternativos quando disponíveis', () => {
            // Arrange
            const seller = {
                id: 1,
                name: 'Loja Test',
                email: 'loja@example.com',
                user: {
                    username: 'usuario_test',
                    email: 'usuario@example.com',
                    userData: {
                        // sem name
                        cpf_cnpj: '12345678901',
                        birth_date: '1990-01-01', // adicionado data de nascimento para CPF
                        // sem phone
                        mobile_phone: '11988888888'
                    }
                }
            };

            // Act
            const result = SellerSubAccountService.formatDataForAsaasSubAccount(seller);

            // Assert
            expect(result).toMatchObject({
                name: seller.user.username,
                email: seller.user.email,
                cpfCnpj: seller.user.userData.cpf_cnpj,
                mobilePhone: seller.user.userData.mobile_phone
            });
        });
    });
});