// Primeiro: definir todos os mocks ANTES de qualquer require
jest.mock('../../../models/Seller', () => {
  const SellerMock = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    // Necessário pois services adicionam métodos ao prototype
    prototype: {}
  };
  return SellerMock;
});
jest.mock('../../../models/User', () => ({}));
jest.mock('../../../models/UserData', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../../models/SellerSubscription', () => ({}));
jest.mock('../../../services/asaas/customer.service', () => ({ createOrUpdate: jest.fn() }));
jest.mock('../../../services/seller-subscription.service', () => ({ createSubscription: jest.fn() }));

// Depois: importar módulos que usarão os mocks
const SellerService = require('../../../services/seller.service');
const Seller = require('../../../models/Seller');
const User = require('../../../models/User');
const UserData = require('../../../models/UserData');
const SellerSubscription = require('../../../models/SellerSubscription');
const AsaasCustomerService = require('../../../services/asaas/customer.service');
const SellerSubscriptionService = require('../../../services/seller-subscription.service');

const sellerBase = { id: 1, nuvemshop_id: '6300987', app_status: 'pending', nuvemshop_info: { email: 'a@b.com', name: { pt: 'Loja' } } };

function mockSellerWithUser(userData) {
  return {
    ...sellerBase,
    user: {
      id: 2,
      email: 'a@b.com',
      update: jest.fn().mockResolvedValue(),
      userData
    },
    update: jest.fn().mockResolvedValue()
  };
}

describe('Completar documentos do Seller atualiza UserData completo', () => {
  afterEach(() => jest.clearAllMocks());

  it('cria UserData se inexistente e preenche todos os campos', async () => {
    const createdUD = { id: 99, update: jest.fn() };
    Seller.findByPk = jest.fn().mockResolvedValue(mockSellerWithUser(null));
    UserData.findOne = jest.fn().mockResolvedValue(null);
    UserData.create = jest.fn().mockResolvedValue(createdUD);
    AsaasCustomerService.createOrUpdate = jest.fn().mockResolvedValue({ success: true, data: { id: 'cus_1' } });
    SellerSubscriptionService.createSubscription = jest.fn().mockResolvedValue({ success: true, data: { asaas_subscription: { id: 'sub_1' } } });

    const res = await SellerService.updateSellerDocuments(1, {
      cpfCnpj: '123', name: 'Nome', phone: '55', address: 'Rua', addressNumber: '10', province: 'SP', postalCode: '00000-000', birthDate: '2000-01-01'
    });

    expect(UserData.create).toHaveBeenCalledWith({
      cpf_cnpj: '123', mobile_phone: '55', address: 'Rua', address_number: '10', province: 'SP', postal_code: '00000-000', birth_date: '2000-01-01', income_value: null, company_type: null
    }, expect.any(Object));

    expect(res.success).toBe(true);
  });

  it('atualiza UserData existente mesclando campos', async () => {
    const ud = { id: 50, cpfCnpj: '123', mobilePhone: null, address: null, update: jest.fn() };
    Seller.findByPk = jest.fn().mockResolvedValue(mockSellerWithUser(ud));
    UserData.findOne = jest.fn().mockResolvedValue(ud);
    AsaasCustomerService.createOrUpdate = jest.fn().mockResolvedValue({ success: true, data: { id: 'cus_2' } });
    SellerSubscriptionService.createSubscription = jest.fn().mockResolvedValue({ success: true, data: { asaas_subscription: { id: 'sub_2' } } });

    await SellerService.updateSellerDocuments(1, {
      cpfCnpj: '123', phone: '9', address: 'R', addressNumber: '20', province: 'RJ', postalCode: '11111-111', birthDate: '1999-01-01'
    });

    expect(ud.update).toHaveBeenCalledWith(expect.objectContaining({
      cpf_cnpj: '123', mobile_phone: '9', address: 'R', address_number: '20', province: 'RJ', postal_code: '11111-111', birth_date: '1999-01-01', income_value: undefined, company_type: undefined
    }), expect.any(Object));
  });
});
