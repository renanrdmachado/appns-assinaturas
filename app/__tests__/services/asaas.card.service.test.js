const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasCardService = require('../../services/asaas/card.service');

jest.mock('../../helpers/AsaasApiClient');

describe('AsaasCardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createRedirectCharge deve chamar lean/payments e retornar invoiceUrl', async () => {
    AsaasApiClient.request.mockResolvedValue({ id: 'pay_1', invoiceUrl: 'https://asaas/inv/123' });

    const res = await AsaasCardService.createRedirectCharge({ customer: 'cus_1', value: 29.9 });

    expect(AsaasApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', endpoint: 'lean/payments'
    }));
    expect(res.success).toBe(true);
    expect(res.data.invoiceUrl).toBe('https://asaas/inv/123');
  });

  test('chargeWithCard deve validar creditCard e holder info', async () => {
    const res = await AsaasCardService.chargeWithCard({ customer: 'cus_1', value: 10 });
    expect(res.success).toBe(false);
    expect(res.status || 400).toBe(400);
  });

  test('chargeWithCard envia dados completos para lean/payments', async () => {
    AsaasApiClient.request.mockResolvedValue({ id: 'pay_2', status: 'CONFIRMED' });
    const payload = {
      customer: 'cus_1', value: 100.0,
      creditCard: { holderName: 'A', number: '5162306219378829', expiryMonth: '05', expiryYear: '2026', ccv: '123' },
      creditCardHolderInfo: { name: 'A B', email: 'a@b.com', cpfCnpj: '12345678909', postalCode: '12345678', addressNumber: '1', mobilePhone: '11999999999' },
      remoteIp: '1.1.1.1'
    };
    const res = await AsaasCardService.chargeWithCard(payload);
    expect(AsaasApiClient.request).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'lean/payments' }));
    expect(res.success).toBe(true);
  });

  test('tokenize deve chamar creditCard/tokenize', async () => {
    AsaasApiClient.request.mockResolvedValue({ creditCardToken: 'tok_1' });
    const res = await AsaasCardService.tokenize({
      customer: 'cus_1',
      creditCard: { holderName: 'A', number: '5162306219378829', expiryMonth: '05', expiryYear: '2026', ccv: '123' },
      creditCardHolderInfo: { name: 'A B', email: 'a@b.com', cpfCnpj: '12345678909', postalCode: '12345678', addressNumber: '1', mobilePhone: '11999999999' }
    });
    expect(AsaasApiClient.request).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'creditCard/tokenize' }));
    expect(res.success).toBe(true);
    expect(res.data.creditCardToken).toBe('tok_1');
  });

  test('chargeWithToken deve recusar sem token', async () => {
    const res = await AsaasCardService.chargeWithToken({ customer: 'cus_1', value: 10 });
    expect(res.success).toBe(false);
  });
});
