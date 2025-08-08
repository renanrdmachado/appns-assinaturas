const AsaasApiClient = require('../../helpers/AsaasApiClient');
jest.mock('../../helpers/AsaasApiClient');

// Mockar o modelo Seller para evitar carregar associações reais
jest.mock('../../models/Seller', () => ({
  findByPk: jest.fn()
}), { virtual: true });

const SellerSubscriptionService = require('../../services/seller-subscription.service');
const Seller = require('../../models/Seller');

describe('SellerSubscriptionService - CREDIT_CARD holder info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('inclui creditCardHolderInfo quando billingType = CREDIT_CARD', async () => {
    // Mock sequência: criar customer, criar assinatura
    AsaasApiClient.request
      .mockResolvedValueOnce({ id: 'cus_1' }) // customers (create)
      .mockResolvedValueOnce({ id: 'sub_1', status: 'ACTIVE' }); // subscriptions (create)

    // Mock de Seller.findByPk
    Seller.findByPk.mockResolvedValue({
      id: 10,
      payments_customer_id: null,
      nuvemshop_info: JSON.stringify({ email: 'seller@x.com' }),
      update: jest.fn()
    });

    const planData = { plan_name: 'Plano Básico', value: 29.9, cycle: 'MONTHLY' };
    const billingInfo = { billingType: 'CREDIT_CARD', name: 'Seller', email: 'seller@x.com', cpfCnpj: '12345678909', phone: '11999999999' };

    // Executa
    const res = await SellerSubscriptionService.createSubscription(10, planData, billingInfo);

    // Verificação: a segunda chamada deve ser para subscriptions com creditCardHolderInfo
    const sent = AsaasApiClient.request.mock.calls[1][0];
    expect(sent.endpoint).toBe('subscriptions');
    expect(sent.data.billingType).toBe('CREDIT_CARD');
    expect(sent.data.creditCardHolderInfo).toBeDefined();
    expect(res.success).toBeTruthy();
  });
});
