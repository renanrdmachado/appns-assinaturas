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
    // Mock sequência: GET customer (sem cpf), PUT customer (update), GET customer (com cpf), POST subscription
    AsaasApiClient.request
      .mockResolvedValueOnce({ 
        id: 'cus_1', 
        name: 'Seller', 
        email: 'seller@x.com' 
        // cpfCnpj ausente propositalmente
      }) // GET customer (verificar estado atual - sem CPF)
      .mockResolvedValueOnce({ 
        id: 'cus_1', 
        name: 'Seller', 
        email: 'seller@x.com',
        cpfCnpj: '12345678909',
        personType: 'FISICA'
      }) // PUT customer (atualizar com CPF)
      .mockResolvedValueOnce({ 
        id: 'cus_1', 
        name: 'Seller', 
        email: 'seller@x.com',
        cpfCnpj: '12345678909',
        personType: 'FISICA'
      }) // GET customer (revalidar após update - com CPF)
      .mockResolvedValueOnce({ 
        id: 'cus_1', 
        name: 'Seller', 
        email: 'seller@x.com',
        cpfCnpj: '12345678909',
        personType: 'FISICA'
      }) // GET customer (pré-checagem antes da subscription)
      .mockResolvedValueOnce({ id: 'sub_1', status: 'ACTIVE' }); // POST subscriptions

    // Mock de Seller.findByPk - seller já tem customer
    Seller.findByPk.mockResolvedValue({
      id: 10,
      payments_customer_id: 'cus_1', // Customer já existe
      nuvemshop_info: JSON.stringify({ email: 'seller@x.com', business_id: '12345678909' }),
      update: jest.fn()
    });

    const planData = { plan_name: 'Plano Básico', value: 29.9, cycle: 'MONTHLY' };
    const billingInfo = { 
      billingType: 'CREDIT_CARD', 
      name: 'Seller', 
      email: 'seller@x.com', 
      cpfCnpj: '123******09',  // CPF mascarado
      phone: '11999999999',
      postalCode: '12345678',  // CEP obrigatório diretamente em billingInfo (não em creditCardHolderInfo)
      creditCard: {
        holderName: 'Seller Name',
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        ccv: '123'
      }
    };

    // Executa
    const res = await SellerSubscriptionService.createSubscription(10, planData, billingInfo);

    // Debug: ver quantas chamadas foram feitas
    console.log('Total de chamadas para AsaasApiClient:', AsaasApiClient.request.mock.calls.length);
    AsaasApiClient.request.mock.calls.forEach((call, index) => {
      console.log(`Chamada ${index + 1}:`, call[0]?.endpoint, call[0]?.method || 'GET');
    });

    // Verificar se houve erro ou sucesso
    if (!res.success) {
      console.log('Erro no resultado:', res.message);
      expect(res.success).toBeTruthy(); // Forçar falha com mensagem de erro
      return;
    }

    // Verificação: a última chamada deve ser para subscriptions com creditCardHolderInfo
    expect(AsaasApiClient.request.mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = AsaasApiClient.request.mock.calls[AsaasApiClient.request.mock.calls.length - 1][0];
    expect(lastCall.endpoint).toBe('subscriptions');
    expect(lastCall.data.billingType).toBe('CREDIT_CARD');
    expect(lastCall.data.creditCardHolderInfo).toBeDefined();
    expect(lastCall.data.creditCardHolderInfo.cpfCnpj).toBe('12345678909'); // CPF foi desmascarado
    expect(res.success).toBeTruthy();
  });
});
