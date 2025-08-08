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
    AsaasApiClient.request
      .mockResolvedValueOnce({ id: 'cus_1' })
      .mockResolvedValueOnce({ id: 'sub_pix', status: 'ACTIVE' });

    Seller.findByPk.mockResolvedValue({
      id: 11,
      payments_customer_id: null,
      nuvemshop_info: JSON.stringify({ email: 'seller@pix.com' }),
      update: jest.fn()
    });

  const billingInfo = { billingType: 'PIX', name: 'Seller Pix', email: 'seller@pix.com', cpfCnpj: '12345678909', phone: '11999999999' };

    const res = await SellerSubscriptionService.createSubscription(11, planData, billingInfo);

    expect(res.success).toBeTruthy();
    const sent = AsaasApiClient.request.mock.calls[1][0];
    expect(sent.endpoint).toBe('subscriptions');
    expect(sent.data.billingType).toBe('PIX');
    expect(sent.data.creditCardHolderInfo).toBeUndefined();
    expect(sent.data.creditCard).toBeUndefined();
    expect(sent.data.creditCardToken).toBeUndefined();
  });

  test('cria assinatura com BOLETO sem exigir holder/card', async () => {
    AsaasApiClient.request
      .mockResolvedValueOnce({ id: 'cus_2' })
      .mockResolvedValueOnce({ id: 'sub_boleto', status: 'ACTIVE' });

    Seller.findByPk.mockResolvedValue({
      id: 12,
      payments_customer_id: null,
      nuvemshop_info: JSON.stringify({ email: 'seller@boleto.com' }),
      update: jest.fn()
    });

  const billingInfo = { billingType: 'BOLETO', name: 'Seller Boleto', email: 'seller@boleto.com', cpfCnpj: '98765432100', phone: '11988887777' };

    const res = await SellerSubscriptionService.createSubscription(12, planData, billingInfo);

    expect(res.success).toBeTruthy();
    const sent = AsaasApiClient.request.mock.calls[1][0];
    expect(sent.endpoint).toBe('subscriptions');
    expect(sent.data.billingType).toBe('BOLETO');
    expect(sent.data.creditCardHolderInfo).toBeUndefined();
    expect(sent.data.creditCard).toBeUndefined();
    expect(sent.data.creditCardToken).toBeUndefined();
  });
});
