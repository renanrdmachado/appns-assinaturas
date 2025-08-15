const AsaasApiClient = require('../../helpers/AsaasApiClient');
jest.mock('../../helpers/AsaasApiClient');

jest.mock('../../models/Seller', () => ({
  findByPk: jest.fn()
}), { virtual: true });

const SellerSubscriptionService = require('../../services/seller-subscription.service');
const Seller = require('../../models/Seller');

describe('SellerSubscriptionService - PIX e BOLETO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const planData = { plan_name: 'Plano PIX', value: 19.9, cycle: 'MONTHLY' };

  test('cria assinatura com PIX sem exigir holder/card', async () => {
    // Mock sequência: criar customer, pré-checagem customer, criar subscription
    AsaasApiClient.request
      .mockResolvedValueOnce({ id: 'cus_1' }) // POST customers (criar customer)
      .mockResolvedValueOnce({ // GET customers (pré-checagem)
        id: 'cus_1', 
        name: 'Seller Pix', 
        email: 'seller@pix.com',
        cpfCnpj: '12345678909',
        personType: 'FISICA'
      })
      .mockResolvedValueOnce({ id: 'sub_pix', status: 'ACTIVE' }); // POST subscriptions

    Seller.findByPk.mockResolvedValue({
      id: 11,
      payments_customer_id: null,
      nuvemshop_info: JSON.stringify({ email: 'seller@pix.com', business_id: '12345678909' }),
      update: jest.fn()
    });

    const billingInfo = { 
      billingType: 'PIX', 
      name: 'Seller Pix', 
      email: 'seller@pix.com', 
      cpfCnpj: '123******09',  // CPF mascarado
      phone: '11999999999' 
    };

    const res = await SellerSubscriptionService.createSubscription(11, planData, billingInfo);

    expect(res.success).toBeTruthy();
    const lastCall = AsaasApiClient.request.mock.calls[AsaasApiClient.request.mock.calls.length - 1][0];
    expect(lastCall.endpoint).toBe('subscriptions');
    expect(lastCall.data.billingType).toBe('PIX');
    expect(lastCall.data.creditCardHolderInfo).toBeUndefined();
    expect(lastCall.data.creditCard).toBeUndefined();
    expect(lastCall.data.creditCardToken).toBeUndefined();
  });

  test('cria assinatura com BOLETO sem exigir holder/card', async () => {
    // Mock sequência: criar customer, pré-checagem customer, criar subscription
    AsaasApiClient.request
      .mockResolvedValueOnce({ id: 'cus_2' }) // POST customers (criar customer)
      .mockResolvedValueOnce({ // GET customers (pré-checagem)
        id: 'cus_2', 
        name: 'Seller Boleto', 
        email: 'seller@boleto.com',
        cpfCnpj: '98765432100',
        personType: 'FISICA'
      })
      .mockResolvedValueOnce({ id: 'sub_boleto', status: 'ACTIVE' }); // POST subscriptions

    Seller.findByPk.mockResolvedValue({
      id: 12,
      payments_customer_id: null,
      nuvemshop_info: JSON.stringify({ email: 'seller@boleto.com', business_id: '98765432100' }),
      update: jest.fn()
    });

    const billingInfo = { 
      billingType: 'BOLETO', 
      name: 'Seller Boleto', 
      email: 'seller@boleto.com', 
      cpfCnpj: '987******00',  // CPF mascarado
      phone: '11988887777' 
    };

    const res = await SellerSubscriptionService.createSubscription(12, planData, billingInfo);

    expect(res.success).toBeTruthy();
    const lastCall = AsaasApiClient.request.mock.calls[AsaasApiClient.request.mock.calls.length - 1][0];
    expect(lastCall.endpoint).toBe('subscriptions');
    expect(lastCall.data.billingType).toBe('BOLETO');
    expect(lastCall.data.creditCardHolderInfo).toBeUndefined();
    expect(lastCall.data.creditCard).toBeUndefined();
    expect(lastCall.data.creditCardToken).toBeUndefined();
  });
});
