const SellerService = require('../../services/seller.service');
const Seller = require('../../models/Seller');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const SellerSubscription = require('../../models/SellerSubscription');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const SellerSubscriptionService = require('../../services/seller-subscription.service');

jest.mock('../../models/Seller', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/User', () => ({}));
jest.mock('../../models/UserData', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../models/SellerSubscription', () => ({}));
jest.mock('../../services/asaas/customer.service', () => ({
  SELLER_GROUP: 'seller_group',
  createOrUpdate: jest.fn()
}));
jest.mock('../../services/seller-subscription.service', () => ({
  createSubscription: jest.fn()
}));

describe('Completar documentos do seller atualiza UserData', () => {
  afterEach(() => jest.clearAllMocks());

  it('atualiza/Cria todos os campos do UserData ao completar documentos', async () => {
    const sellerMock = {
      id: 1,
      app_status: 'pending',
      nuvemshop_id: 'ns1',
      nuvemshop_info: { email: 's@e.com', name: { pt: 'Loja' } },
      user: {
        id: 10,
        email: 's@e.com',
        update: jest.fn(),
        userData: null
      },
      update: jest.fn()
    };

    require('../../models/Seller').findByPk.mockResolvedValue(sellerMock);
    require('../../models/UserData').findOne.mockResolvedValue(null);
    require('../../models/UserData').create.mockResolvedValue({ id: 33, update: jest.fn() });
    require('../../services/asaas/customer.service').createOrUpdate.mockResolvedValue({ success: true, data: { id: 'cust1' } });
    require('../../services/seller-subscription.service').createSubscription.mockResolvedValue({ success: true, data: { asaas_subscription: { id: 'sub1' } } });

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

    expect(require('../../models/UserData').create).toHaveBeenCalledWith(expect.objectContaining({
      cpfCnpj: '123',
      mobilePhone: '999',
      address: 'Rua',
      addressNumber: '10',
      province: 'SP',
      postalCode: '00000-000',
      birthDate: '2000-01-01'
    }), expect.any(Object));

    expect(require('../../services/asaas/customer.service').createOrUpdate).toHaveBeenCalled();
    expect(require('../../services/seller-subscription.service').createSubscription).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });
});
