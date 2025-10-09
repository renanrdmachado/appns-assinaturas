jest.mock('../../models/Order', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/Product', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/Shopper', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/Seller', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/User', () => ({}));
jest.mock('../../models/UserData', () => ({}));
jest.mock('../../models/ShopperSubscription', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../services/asaas/customer.service', () => ({
  SHOPPER_GROUP: 'SHOPPER',
  findByCpfCnpj: jest.fn().mockResolvedValue({ success: false }),
  create: jest.fn().mockResolvedValue({ success: true, data: { id: 'cus_1' } })
}));
jest.mock('../../services/asaas/subscription.service', () => ({
  create: jest.fn().mockResolvedValue({ success: true, data: { id: 'sub_1' } }),
  update: jest.fn().mockResolvedValue({ success: true, data: {} }),
  delete: jest.fn().mockResolvedValue({ success: true })
}));
jest.mock('../../utils/asaas-subscription.mapper', () => ({
  composeCardSection: (data) => ({
    billingType: data.billingType,
    creditCardToken: data.creditCardToken,
    remoteIp: data.remoteIp
  })
}));
jest.mock('../../utils/asaas-formatter', () => ({
  normalizeCycle: (c) => (c || 'MONTHLY').toUpperCase(),
  isValidCycle: () => true,
  formatDate: (d) => {
    const dd = new Date(d); const y = dd.getFullYear(); const m = String(dd.getMonth() + 1).padStart(2, '0'); const da = String(dd.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  },
  mapAsaasStatusToLocalStatus: (s) => (s === 'ACTIVE' ? 'active' : 'pending')
}));

const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Shopper = require('../../models/Shopper');
const Seller = require('../../models/Seller');
const ShopperSubscription = require('../../models/ShopperSubscription');
const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
const ShopperSubscriptionService = require('../../services/shopper-subscription.service');

describe('ShopperSubscriptionService - usa value do Order e ciclo do Produto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock padrão do Seller com wallet configurada
    Seller.findByPk.mockResolvedValue({
      id: 1,
      subaccount_wallet_id: '7b3b92a0-4d11-4e22-a3f4-3bd76abc11ff'
    });
  });

  test('create usa order.value como value e product.cycle como ciclo', async () => {
    const orderId = 10;
    const shopperId = 7;

    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 3, shopper_id: shopperId, seller_id: 1, value: 123.45 });
    Product.findByPk.mockResolvedValue({ id: 3, cycle: 'MONTHLY', price: 99.9 });
    Shopper.findByPk.mockResolvedValue({
      id: shopperId,
      name: 'Comprador',
      email: 'c@e.com',
      user: { email: 'c@e.com', userData: { cpfCnpj: '12345678901' } },
      update: jest.fn()
    });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 55 });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });

    expect(res.success).toBe(true);
    // Confere chamada ao Asaas com value do order
    expect(AsaasSubscriptionService.create).toHaveBeenCalledWith(expect.objectContaining({
      value: 123.45,
      cycle: 'MONTHLY',
      customer: 'cus_1'
    }));

    // Confere criação local com value correto
    expect(ShopperSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
      value: 123.45,
      order_id: orderId,
      shopper_id: shopperId,
      cycle: 'MONTHLY'
    }), expect.any(Object));
  });

  test('usa payments_customer_id existente sem criar/consultar cliente', async () => {
    const orderId = 11;
    const shopperId = 8;

    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 4, shopper_id: shopperId, seller_id: 1, value: 50 });
    Product.findByPk.mockResolvedValue({ id: 4, cycle: 'YEARLY', price: 99.9 });
    Shopper.findByPk.mockResolvedValue({
      id: shopperId,
      name: 'Comprador',
      email: 'c@e.com',
      payments_customer_id: 'cus_existing',
      user: { email: 'c@e.com', userData: { cpfCnpj: '12345678901' } },
      update: jest.fn()
    });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 56 });

    const AsaasCustomerService = require('../../services/asaas/customer.service');

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });

    expect(res.success).toBe(true);
    expect(AsaasCustomerService.findByCpfCnpj).not.toHaveBeenCalled();
    expect(AsaasCustomerService.create).not.toHaveBeenCalled();
    const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
    expect(AsaasSubscriptionService.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
      value: 50,
      cycle: 'YEARLY'
    }));
  });

  test('reutiliza cliente existente no Asaas quando CPF/CNPJ já está cadastrado', async () => {
    const orderId = 12;
    const shopperId = 9;
    const AsaasCustomerService = require('../../services/asaas/customer.service');
    AsaasCustomerService.findByCpfCnpj.mockResolvedValueOnce({ success: true, data: { id: 'cus_reuse' } });

    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 5, shopper_id: shopperId, seller_id: 1, value: 75 });
    Product.findByPk.mockResolvedValue({ id: 5, cycle: 'QUARTERLY' });
    const update = jest.fn();
    Shopper.findByPk.mockResolvedValue({
      id: shopperId,
      name: 'Comprador',
      email: 'c@e.com',
      user: { email: 'c@e.com', userData: { cpfCnpj: '12345678901' } },
      update
    });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 57 });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });
    expect(res.success).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ payments_customer_id: 'cus_reuse' }), expect.any(Object));
  });

  test('erro quando cpfCnpj ausente', async () => {
    const orderId = 13;
    const shopperId = 10;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 6, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue({ id: 6, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, name: 'C', user: { userData: {} }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/CPF\/CNPJ.*(preenchido|obrigat)/i);
  });

  test('erro quando cpfCnpj tem tamanho inválido', async () => {
    const orderId = 14;
    const shopperId = 11;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 7, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue({ id: 7, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, name: 'C', user: { userData: { cpfCnpj: '123' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/formato inválido/i);
  });

  test('bloqueia criação se já existir assinatura para o pedido', async () => {
    const orderId = 15;
    const shopperId = 12;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 8, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue({ id: 8, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue({ id: 999 });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  test('erro se Order não existe', async () => {
    Order.findByPk.mockResolvedValue(null);
    const res = await ShopperSubscriptionService.create(999, { billing_type: 'BOLETO' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Pedido não encontrado/i);
  });

  test('inclui nextDueDate derivada e aceita CREDIT_CARD com token', async () => {
    const orderId = 16;
    const shopperId = 13;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 9, shopper_id: shopperId, seller_id: 1, value: 45 });
    Product.findByPk.mockResolvedValue({ id: 9, cycle: 'BIMONTHLY' });
    Shopper.findByPk.mockResolvedValue({
      id: shopperId,
      user: { email: 'c@e.com', userData: { cpfCnpj: '12345678901', postalCode: '00000000' } },
      update: jest.fn()
    });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 58 });
    const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
    AsaasSubscriptionService.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_card' } });

    const payload = { billing_type: 'CREDIT_CARD', creditCardToken: 'tok_123', remoteIp: '1.1.1.1' };
    const res = await ShopperSubscriptionService.create(orderId, payload);
    expect(res.success).toBe(true);
    // nextDueDate deve estar presente na requisição
    expect(AsaasSubscriptionService.create).toHaveBeenCalledWith(expect.objectContaining({ nextDueDate: expect.any(String), billingType: 'CREDIT_CARD', creditCardToken: 'tok_123' }));
  });

  test('retorna erro quando criação no Asaas falha', async () => {
    const orderId = 17;
    const shopperId = 14;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 10, shopper_id: shopperId, seller_id: 1, value: 60 });
    Product.findByPk.mockResolvedValue({ id: 10, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);
    const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
    AsaasSubscriptionService.create.mockResolvedValueOnce({ success: false, message: 'erro asaas' });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/erro asaas/i);
  });

  test('retorna erro quando criação de cliente no Asaas falha', async () => {
    const orderId = 18;
    const shopperId = 15;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 11, shopper_id: shopperId, seller_id: 1, value: 60 });
    Product.findByPk.mockResolvedValue({ id: 11, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);
    const AsaasCustomerService = require('../../services/asaas/customer.service');
    AsaasCustomerService.create.mockResolvedValueOnce({ success: false, message: 'erro cliente' });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/erro cliente/i);
  });

  test('create usa fallback de preço do produto quando order.value ausente (subscription_price)', async () => {
    const orderId = 19;
    const shopperId = 16;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 12, shopper_id: shopperId, seller_id: 1, value: undefined });
    Product.findByPk.mockResolvedValue({ id: 12, cycle: 'MONTHLY', subscription_price: 33.33 });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 59 });

    const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
    AsaasSubscriptionService.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_fallback' } });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });
    expect(res.success).toBe(true);
    expect(AsaasSubscriptionService.create).toHaveBeenCalledWith(expect.objectContaining({ value: 33.33 }));
  });

  test('create usa getSubscriptionPrice quando disponível', async () => {
    const orderId = 20;
    const shopperId = 17;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 13, shopper_id: shopperId, seller_id: 1, value: null });
    Product.findByPk.mockResolvedValue({ id: 13, cycle: 'MONTHLY', getSubscriptionPrice: () => 44.44 });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockResolvedValue({ id: 60 });
    const AsaasSubscriptionService = require('../../services/asaas/subscription.service');
    AsaasSubscriptionService.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_getprice' } });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'BOLETO' });
    expect(res.success).toBe(true);
    expect(AsaasSubscriptionService.create).toHaveBeenCalledWith(expect.objectContaining({ value: 44.44 }));
  });

  test('create retorna 404 quando produto do pedido não encontrado', async () => {
    const orderId = 21;
    const shopperId = 18;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 999, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue(null);
    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  test('create retorna erro quando cálculo de next_due_date falha', async () => {
    const orderId = 24;
    const shopperId = 40;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 99, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue({ id: 99, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    const svc = ShopperSubscriptionService;
    const orig = svc.calculateNextDueDate;
    try {
      svc.calculateNextDueDate = jest.fn(() => { throw new Error('calc error'); });
      const res = await svc.create(orderId, { billing_type: 'PIX' });
      expect(res.success).toBe(false);
      expect(res.message || '').toMatch(/Erro interno do servidor/i);
    } finally {
      svc.calculateNextDueDate = orig;
    }
  });

  test('create retorna erro quando validação de dados falha', async () => {
    const orderId = 25;
    const shopperId = 41;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 100, shopper_id: shopperId, seller_id: 1, value: 10 });
    Product.findByPk.mockResolvedValue({ id: 100, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    const SubscriptionValidator = require('../../validators/subscription-validator');
    const orig = SubscriptionValidator.validateCreateData;
    try {
      SubscriptionValidator.validateCreateData = jest.fn(() => { throw new Error('invalid create'); });
      const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
      expect(res.success).toBe(false);
      expect(res.message || '').toMatch(/Erro interno do servidor/i);
    } finally {
      SubscriptionValidator.validateCreateData = orig;
    }
  });

  test('create retorna erro 400 quando orderId não é fornecido', async () => {
    const res = await ShopperSubscriptionService.create(undefined, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  test('create retorna erro 400 quando order não tem shopper_id', async () => {
    const orderId = 22;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 30, shopper_id: null, seller_id: 1, value: 10 });
    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  test('create retorna 404 quando shopper não encontrado', async () => {
    const orderId = 23;
    const shopperId = 31;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 30, shopper_id: shopperId, seller_id: 1, value: 10 });
    Shopper.findByPk.mockResolvedValue(null);
    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  test('get retorna erro sem id, 404 quando não encontra e sucesso quando encontra', async () => {
    const resNoId = await ShopperSubscriptionService.get();
    expect(resNoId.success).toBe(false);
    expect(resNoId.status).toBe(400);

    const model = require('../../models/ShopperSubscription');
    model.findByPk = jest.fn().mockResolvedValue(null);
    const res404 = await ShopperSubscriptionService.get(999);
    expect(res404.success).toBe(false);
    expect(res404.status).toBe(404);

    model.findByPk = jest.fn().mockResolvedValue({ id: 1 });
    const resOk = await ShopperSubscriptionService.get(1);
    expect(resOk.success).toBe(true);

    // força erro interno para cobrir catch
    const model2 = require('../../models/ShopperSubscription');
    model2.findByPk = jest.fn().mockRejectedValue(new Error('db error'));
    const resErr = await ShopperSubscriptionService.get(2);
    expect(resErr.success).toBe(false);
  });

  test('getAll retorna lista', async () => {
    const model = require('../../models/ShopperSubscription');
    model.findAll = jest.fn().mockResolvedValue([{ id: 1 }]);
    const res = await ShopperSubscriptionService.getAll();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);

    // força erro interno
    model.findAll = jest.fn().mockRejectedValue(new Error('db error'));
    const resErr = await ShopperSubscriptionService.getAll();
    expect(resErr.success).toBe(false);
  });

  test('getByShopperId valida id, 404 quando shopper não existe e retorna lista quando existe', async () => {
    let r = await ShopperSubscriptionService.getByShopperId();
    expect(r.success).toBe(false);
    expect(r.status).toBe(400);

    const ShopperModel = require('../../models/Shopper');
    ShopperModel.findByPk.mockResolvedValue(null);
    r = await ShopperSubscriptionService.getByShopperId(999);
    expect(r.success).toBe(false);
    expect(r.status).toBe(404);

    ShopperModel.findByPk.mockResolvedValue({ id: 7, user: { userData: {} } });
    const model = require('../../models/ShopperSubscription');
    model.findAll = jest.fn().mockResolvedValue([{ id: 1 }]);
    r = await ShopperSubscriptionService.getByShopperId(7);
    expect(r.success).toBe(true);

    // erro interno no findAll para cobrir catch
    const model2 = require('../../models/ShopperSubscription');
    model2.findAll = jest.fn().mockRejectedValue(new Error('db error'));
    const rErr = await ShopperSubscriptionService.getByShopperId(7);
    expect(rErr.success).toBe(false);
  });

  test('getByOrderId valida id, 404 quando order não existe e retorna lista quando existe', async () => {
    let r = await ShopperSubscriptionService.getByOrderId();
    expect(r.success).toBe(false);
    expect(r.status).toBe(400);

    const OrderModel = require('../../models/Order');
    OrderModel.findByPk.mockResolvedValue(null);
    r = await ShopperSubscriptionService.getByOrderId(999);
    expect(r.success).toBe(false);
    expect(r.status).toBe(404);

    OrderModel.findByPk.mockResolvedValue({ id: 10 });
    const model = require('../../models/ShopperSubscription');
    model.findAll = jest.fn().mockResolvedValue([{ id: 1 }]);
    r = await ShopperSubscriptionService.getByOrderId(10);
    expect(r.success).toBe(true);

    // erro interno no findAll para cobrir catch
    const model2 = require('../../models/ShopperSubscription');
    model2.findAll = jest.fn().mockRejectedValue(new Error('db error'));
    const rErr = await ShopperSubscriptionService.getByOrderId(10);
    expect(rErr.success).toBe(false);
  });

  test('getByExternalId exige id, 404 quando não encontra e retorna quando encontra', async () => {
    let r = await ShopperSubscriptionService.getByExternalId();
    expect(r.success).toBe(false);
    expect(r.status).toBe(400);

    const model = require('../../models/ShopperSubscription');
    model.findOne = jest.fn().mockResolvedValue(null);
    r = await ShopperSubscriptionService.getByExternalId('notfound');
    expect(r.success).toBe(false);
    expect(r.status).toBe(404);

    model.findOne = jest.fn().mockResolvedValue({ id: 1 });
    r = await ShopperSubscriptionService.getByExternalId('ok');
    expect(r.success).toBe(true);

    // erro interno para cobrir catch
    const model2 = require('../../models/ShopperSubscription');
    model2.findOne = jest.fn().mockRejectedValue(new Error('db error'));
    const rErr = await ShopperSubscriptionService.getByExternalId('err');
    expect(rErr.success).toBe(false);
  });

  test('updateStatusLocal valida id e atualiza status', async () => {
    const rNoId = await ShopperSubscriptionService.updateStatusLocal();
    expect(rNoId.success).toBe(false);
    expect(rNoId.status).toBe(400);

    const model = require('../../models/ShopperSubscription');
    model.findByPk = jest.fn().mockResolvedValue(null);
    const r404 = await ShopperSubscriptionService.updateStatusLocal(1, 'active');
    expect(r404.success).toBe(false);
    expect(r404.status).toBe(404);

    const sub = { id: 1, update: jest.fn().mockResolvedValue({}) };
    model.findByPk = jest.fn().mockResolvedValue(sub);
    const rOk = await ShopperSubscriptionService.updateStatusLocal(1, 'active');
    expect(rOk.success).toBe(true);
    expect(sub.update).toHaveBeenCalledWith({ status: 'active' });
  });

  test('calculateNextDueDate cobre todos ciclos', () => {
    const base = new Date('2025-01-01T00:00:00Z');
    const svc = ShopperSubscriptionService;
    expect(svc.calculateNextDueDate('WEEKLY', base).getUTCDate()).toBe(8);
    expect(svc.calculateNextDueDate('BIWEEKLY', base).getUTCDate()).toBe(15);
    expect(svc.calculateNextDueDate('BIMONTHLY', base).getUTCMonth()).toBe(2);
    expect(svc.calculateNextDueDate('QUARTERLY', base).getUTCMonth()).toBe(3);
    expect(svc.calculateNextDueDate('SEMIANNUALLY', base).getUTCMonth()).toBe(6);
    expect(svc.calculateNextDueDate('YEARLY', base).getUTCFullYear()).toBe(2026);
    expect(svc.calculateNextDueDate('MONTHLY', base).getUTCMonth()).toBe(1);
    expect(svc.calculateNextDueDate(undefined, base).getUTCMonth()).toBe(1);
  });

  test('formatDataForAsaasUpdate mapeia campos corretamente', () => {
    const svc = ShopperSubscriptionService;
    const d = svc.formatDataForAsaasUpdate({
      value: 10,
      next_due_date: '2025-02-01',
      cycle: 'monthly',
      plan_name: 'Plan',
      end_date: '2025-12-31',
      max_payments: 12,
      billing_type: 'PIX'
    });
    expect(d).toMatchObject({ value: 10, cycle: 'MONTHLY', description: 'Plan', maxPayments: 12, billingType: 'PIX' });
    expect(typeof d.nextDueDate).toBe('string');
    expect(typeof d.endDate).toBe('string');

    const removeEnd = svc.formatDataForAsaasUpdate({ end_date: null });
    expect(removeEnd).toMatchObject({ endDate: null });
  });

  test('formatDataForAsaasSubscription trata erro de formatDate (next_due_date e end_date)', () => {
    const svc = ShopperSubscriptionService;
    const order = { id: 99 };
    const shopper = { id: 199 };
    const AsaasFormatter = require('../../utils/asaas-formatter');

    // erro ao formatar next_due_date
    const orig = AsaasFormatter.formatDate;
    try {
      AsaasFormatter.formatDate = jest.fn(() => { throw new Error('bad date'); });
      expect(() => svc.formatDataForAsaasSubscription({ value: 10, cycle: 'MONTHLY', billing_type: 'PIX', next_due_date: new Date() }, 'cus_a', shopper, order))
        .toThrow(/Erro ao formatar data de vencimento/i);

      // sucesso no next_due_date e erro ao formatar end_date (2ª chamada)
      let call = 0;
      AsaasFormatter.formatDate = jest.fn(() => {
        call += 1;
        if (call === 2) throw new Error('bad end');
        return '2025-01-01';
      });
      expect(() => svc.formatDataForAsaasSubscription({ value: 10, cycle: 'MONTHLY', billing_type: 'PIX', next_due_date: new Date(), end_date: new Date() }, 'cus_b', shopper, order))
        .toThrow(/Erro ao formatar data final/i);
    } finally {
      AsaasFormatter.formatDate = orig;
    }
  });

  test('formatDataForAsaasUpdate lança erro quando formatDate falha', () => {
    const svc = ShopperSubscriptionService;
    const AsaasFormatter = require('../../utils/asaas-formatter');
    const orig = AsaasFormatter.formatDate;
    try {
      AsaasFormatter.formatDate = jest.fn(() => { throw new Error('bad date'); });
      expect(() => svc.formatDataForAsaasUpdate({ next_due_date: new Date() })).toThrow(/vencimento/);
      expect(() => svc.formatDataForAsaasUpdate({ end_date: new Date() })).toThrow(/data final/i);
    } finally {
      AsaasFormatter.formatDate = orig;
    }
  });

  test('update retorna erro quando validação falha', async () => {
    const SubscriptionValidator = require('../../validators/subscription-validator');
    // simula falha de validação
    const orig = SubscriptionValidator.validateUpdateData;
    try {
      SubscriptionValidator.validateUpdateData = jest.fn(() => { throw new Error('invalid'); });
      const res = await ShopperSubscriptionService.update(1, { value: 1 });
      expect(res.success).toBe(false);
    } finally {
      SubscriptionValidator.validateUpdateData = orig;
    }
  });

  test('update captura erro interno ao salvar localmente', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 33, update: jest.fn().mockRejectedValue(new Error('db err')) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const r = await ShopperSubscriptionService.update(33, { value: 10 });
    expect(r.success).toBe(false);
  });

  test('formatDataForAsaasSubscription exige next_due_date e customer', () => {
    const svc = ShopperSubscriptionService;
    const order = { id: 1 };
    const shopper = { id: 2 };
    expect(() => svc.formatDataForAsaasSubscription({ value: 10, cycle: 'MONTHLY', billing_type: 'BOLETO' }, null, shopper, order)).toThrow(/Customer ID é obrigatório/);
    expect(() => svc.formatDataForAsaasSubscription({ value: 10, cycle: 'MONTHLY', billing_type: 'BOLETO' }, 'cus', shopper, order)).toThrow(/Data de vencimento/);
  });

  test('update aplica validação e mapeamento de dados', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 1, external_id: 'sub_1', status: 'pending', update: jest.fn().mockResolvedValue({}) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.update = jest.fn().mockResolvedValue({ success: true, data: {} });

    const res = await ShopperSubscriptionService.update(1, { value: 99.9, cycle: 'MONTHLY' });
    expect(res.success).toBe(true);
    expect(subscriptionApi.update).toHaveBeenCalledWith('sub_1', expect.objectContaining({ value: 99.9, cycle: 'MONTHLY' }));
    expect(sub.update).toHaveBeenCalledWith(expect.objectContaining({ value: 99.9, cycle: 'MONTHLY' }));
  });

  test('update retorna erro quando Asaas retorna falha', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 1, external_id: 'sub_err', status: 'pending', update: jest.fn() };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.update.mockResolvedValueOnce({ success: false, message: 'asaas fail' });
    const res = await ShopperSubscriptionService.update(1, { value: 1 });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/asaas fail/i);
  });

  test('update retorna erro 400 quando id não é fornecido', async () => {
    const res = await ShopperSubscriptionService.update(undefined, { value: 1 });
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  test('update retorna 404 quando assinatura não encontrada', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(null);
    const res = await ShopperSubscriptionService.update(999, { value: 10 });
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  test('update atualiza status local quando Asaas retorna status', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 1, external_id: 'sub_2', status: 'pending', update: jest.fn().mockResolvedValue({}) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.update.mockResolvedValueOnce({ success: true, data: { status: 'ACTIVE' } });

    const res = await ShopperSubscriptionService.update(1, { value: 10 });
    expect(res.success).toBe(true);
    expect(sub.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  test('update sem external_id não chama Asaas e atualiza local', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 3, update: jest.fn().mockResolvedValue({}) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.update.mockClear();

    const res = await ShopperSubscriptionService.update(3, { value: 77 });
    expect(res.success).toBe(true);
    expect(subscriptionApi.update).not.toHaveBeenCalled();
    expect(sub.update).toHaveBeenCalledWith(expect.objectContaining({ value: 77 }));
  });

  test('delete remove assinatura existente', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 2, destroy: jest.fn().mockResolvedValue({}) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const res = await ShopperSubscriptionService.delete(2);
    expect(res.success).toBe(true);
    expect(sub.destroy).toHaveBeenCalled();
  });

  test('delete retorna erro 400 quando id não é fornecido', async () => {
    const res = await ShopperSubscriptionService.delete();
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
  });

  test('delete retorna 404 quando assinatura não encontrada', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(null);
    const res = await ShopperSubscriptionService.delete(999);
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  test('formatDataForAsaasSubscription mapeia campos opcionais (discount, interest, fine, max_payments, end_date)', () => {
    const svc = ShopperSubscriptionService;
    const order = { id: 10 };
    const shopper = { id: 20 };
    const data = {
      value: 12.34,
      cycle: 'monthly',
      billing_type: 'PIX',
      plan_name: 'Plano X',
      next_due_date: new Date('2025-01-05T00:00:00Z'),
      end_date: new Date('2025-12-31T00:00:00Z'),
      discount: { value: 1, dueDateLimitDays: 5 },
      interest: { value: 2 },
      fine: { value: 3 },
      max_payments: 10
    };
    const out = svc.formatDataForAsaasSubscription(data, 'cus_x', shopper, order);
    expect(out).toMatchObject({
      customer: 'cus_x',
      billingType: 'PIX',
      value: 12.34,
      cycle: 'MONTHLY',
      description: 'Plano X',
      discount: { value: 1, dueDateLimitDays: 5 },
      interest: { value: 2 },
      fine: { value: 3 },
      maxPayments: 10,
      externalReference: 'order_subscription_10'
    });
    expect(out.nextDueDate).toMatch(/^2025-01-05|2025-01-04/);
    expect(out.endDate).toMatch(/^2025-12-31|2025-12-30/);
  });

  test('delete com external_id aciona Asaas e trata erro do Asaas', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 4, external_id: 'sub_del', destroy: jest.fn().mockResolvedValue({}) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.delete.mockResolvedValueOnce({ success: false, message: 'erro delete' });
    const rErr = await ShopperSubscriptionService.delete(4);
    expect(rErr.success).toBe(false);
    expect(rErr.message).toMatch(/erro delete/i);

    // sucesso
    subscriptionApi.delete.mockResolvedValueOnce({ success: true });
    const rOk = await ShopperSubscriptionService.delete(4);
    expect(rOk.success).toBe(true);
    expect(subscriptionApi.delete).toHaveBeenCalledWith('sub_del');
  });

  test('delete captura erro interno ao destruir localmente', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 5, destroy: jest.fn().mockRejectedValue(new Error('db err')) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const r = await ShopperSubscriptionService.delete(5);
    expect(r.success).toBe(false);
  });

  test('updateStatusLocal captura erro interno', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 6, update: jest.fn().mockRejectedValue(new Error('db err')) };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const r = await ShopperSubscriptionService.updateStatusLocal(6, 'paused');
    expect(r.success).toBe(false);
  });

  test('create captura erro interno ao criar no banco', async () => {
    const orderId = 26;
    const shopperId = 50;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 200, shopper_id: shopperId, seller_id: 1, value: 30 });
    Product.findByPk.mockResolvedValue({ id: 200, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    const AsaasSubscription = require('../../services/asaas/subscription.service');
    AsaasSubscription.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_ok' } });
    const model = require('../../models/ShopperSubscription');
    model.findOne = jest.fn().mockResolvedValue(null);
    model.create = jest.fn().mockRejectedValue(new Error('db create err'));
    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX' });
    expect(res.success).toBe(false);
  });

  test('update captura exceção lançada pela API do Asaas', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 70, external_id: 'sub_throw', update: jest.fn() };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.update.mockRejectedValueOnce(new Error('api throw'));
    const r = await ShopperSubscriptionService.update(70, { value: 1 });
    expect(r.success).toBe(false);
  });

  test('delete captura exceção lançada pela API do Asaas', async () => {
    const ShopperSubscriptionModel = require('../../models/ShopperSubscription');
    const sub = { id: 80, external_id: 'sub_throw', destroy: jest.fn() };
    ShopperSubscriptionModel.findByPk = jest.fn().mockResolvedValue(sub);
    const subscriptionApi = require('../../services/asaas/subscription.service');
    subscriptionApi.delete.mockRejectedValueOnce(new Error('api throw'));
    const r = await ShopperSubscriptionService.delete(80);
    expect(r.success).toBe(false);
  });

  test('create usa next_due_date fornecida e preserva start_date/status informados', async () => {
    const orderId = 27;
    const shopperId = 60;
    const fixedDue = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // futuro
    const fixedStart = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 300, shopper_id: shopperId, seller_id: 1, value: 88 });
    Product.findByPk.mockResolvedValue({ id: 300, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, user: { userData: { cpfCnpj: '12345678901' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);
    ShopperSubscription.create.mockImplementation(async (payload) => ({ id: 61, ...payload }));
    const AsaasSubscription = require('../../services/asaas/subscription.service');
    AsaasSubscription.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_fixed' } });

    const res = await ShopperSubscriptionService.create(orderId, { billing_type: 'PIX', next_due_date: fixedDue, start_date: fixedStart, status: 'active' });
    expect(res.success).toBe(true);
    // garantir que nextDueDate enviado ao Asaas corresponde ao fixedDue fornecido (formato de data)
    expect(AsaasSubscription.create).toHaveBeenCalledWith(expect.objectContaining({ nextDueDate: expect.any(String) }));
    // garantir que create local recebeu start_date e status final 'pending'
    expect(ShopperSubscription.create).toHaveBeenCalledWith(expect.objectContaining({ start_date: fixedStart, status: 'pending' }), expect.any(Object));
  });

  test('create com CREDIT_CARD e dados explícitos de cartão', async () => {
    const orderId = 28;
    const shopperId = 61;
    Order.findByPk.mockResolvedValue({ id: orderId, product_id: 301, shopper_id: shopperId, seller_id: 1, value: 120 });
    Product.findByPk.mockResolvedValue({ id: 301, cycle: 'MONTHLY' });
    Shopper.findByPk.mockResolvedValue({ id: shopperId, name: 'N', email: 'n@e.com', user: { email: 'n@e.com', userData: { cpfCnpj: '12345678901', postalCode: '01001000' } }, update: jest.fn() });
    ShopperSubscription.findOne.mockResolvedValue(null);

    // sobrescreve composeCardSection para incluir creditCard e creditCardHolderInfo
    const mapper = require('../../utils/asaas-subscription.mapper');
    const origCompose = mapper.composeCardSection;
    mapper.composeCardSection = (data) => ({
      billingType: data.billingType,
      creditCard: data.creditCard,
      creditCardHolderInfo: data.creditCardHolderInfo,
      remoteIp: data.remoteIp
    });

    const AsaasSubscription = require('../../services/asaas/subscription.service');
    AsaasSubscription.create.mockResolvedValueOnce({ success: true, data: { id: 'sub_cc' } });

    try {
      const payload = {
        billing_type: 'CREDIT_CARD',
        creditCard: { holderName: 'N', number: '4111111111111111', expiryMonth: '12', expiryYear: '2026', ccv: '123' },
        creditCardHolderInfo: { name: 'N', email: 'n@e.com', cpfCnpj: '12345678901', postalCode: '01001000' },
        remoteIp: '2.2.2.2'
      };
      const res = await ShopperSubscriptionService.create(orderId, payload);
      expect(res.success).toBe(true);
      // valida que creditCard e holder info foram propagados ao payload do Asaas
      expect(AsaasSubscription.create).toHaveBeenCalledWith(expect.objectContaining({
        billingType: 'CREDIT_CARD',
        creditCard: expect.objectContaining({ number: expect.any(String) }),
        creditCardHolderInfo: expect.objectContaining({ cpfCnpj: expect.any(String) }),
        remoteIp: '2.2.2.2'
      }));
    } finally {
      mapper.composeCardSection = origCompose;
    }
  });
});
