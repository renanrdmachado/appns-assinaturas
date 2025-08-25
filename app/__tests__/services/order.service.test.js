jest.mock('../../models/Order', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn()
}));

jest.mock('../../models/Product', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/Shopper', () => ({ findByPk: jest.fn() }));
jest.mock('../../models/Seller', () => ({ findByPk: jest.fn() }));

// Mock do validator para usar implementacao real (sem mocks)
jest.mock('../../validators/order-validator', () => jest.requireActual('../../validators/order-validator'));

const OrderService = require('../../services/order.service');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Shopper = require('../../models/Shopper');
const Seller = require('../../models/Seller');

describe('OrderService - validação de valor positivo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('create falha quando value <= 0', async () => {
    Product.findByPk.mockResolvedValue({ id: 10, seller_id: 5 });
    Shopper.findByPk.mockResolvedValue({ id: 7 });
    Seller.findByPk.mockResolvedValue({ id: 5 });

    const res = await OrderService.create({ shopper_id: 7, product_id: 10, value: 0, customer_info: {} });

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/valor.*positivo|value.*positivo/i);
    expect(Order.create).not.toHaveBeenCalled();
  });

  test('create falha quando product_id ausente', async () => {
    const res = await OrderService.create({ shopper_id: 7, value: 10, customer_info: {} });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/product_id.*obrigatório/i);
  });

  test('create falha quando produto não encontrado', async () => {
    Product.findByPk.mockResolvedValue(null);
    const res = await OrderService.create({ shopper_id: 7, product_id: 999, value: 10, customer_info: {} });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Produto não encontrado/i);
  });

  test('create falha quando shopper não existe', async () => {
    Product.findByPk.mockResolvedValue({ id: 10, seller_id: 5 });
    Shopper.findByPk.mockResolvedValue(null);
    Seller.findByPk.mockResolvedValue({ id: 5 });
    const res = await OrderService.create({ shopper_id: 999, product_id: 10, value: 10, customer_info: {} });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Comprador.*não encontrado/i);
  });

  test('create falha quando seller não existe', async () => {
    Product.findByPk.mockResolvedValue({ id: 10, seller_id: 5 });
    Shopper.findByPk.mockResolvedValue({ id: 7 });
    Seller.findByPk.mockResolvedValue(null);
    const res = await OrderService.create({ shopper_id: 7, product_id: 10, value: 10, customer_info: {} });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Vendedor.*não encontrado/i);
  });

  test('create sucesso com value > 0 e atribui seller do produto', async () => {
    Product.findByPk.mockResolvedValue({ id: 10, seller_id: 5 });
    Shopper.findByPk.mockResolvedValue({ id: 7 });
    Seller.findByPk.mockResolvedValue({ id: 5 });

    Order.create.mockResolvedValue({
      id: 1,
      seller_id: 5,
      shopper_id: 7,
      product_id: 10,
      value: 99.9,
      toJSON: function () { return { id: 1, seller_id: 5, shopper_id: 7, product_id: 10, value: 99.9 }; }
    });

    const res = await OrderService.create({ shopper_id: 7, product_id: 10, value: 99.9, customer_info: {} });

    expect(res.success).toBe(true);
    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({ seller_id: 5, value: 99.9 }));
  });

  test('update falha com value inválido (<=0)', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn() };
    Order.findByPk.mockResolvedValue(existing);

    const res = await OrderService.update(1, { value: 0 });

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/valor.*positivo|value.*positivo/i);
    expect(existing.update).not.toHaveBeenCalled();
  });

  test('update sucesso com value > 0', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn(), toJSON: () => ({ id: 1, value: 50 }) };
    Order.findByPk.mockResolvedValue(existing);

    const res = await OrderService.update(1, { value: 50 });

    expect(res.success).toBe(true);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ value: 50 }));
  });

  test('get retorna erro quando não encontra', async () => {
    Order.findByPk.mockResolvedValue(null);
    const res = await OrderService.get(999);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/não encontrado/i);
  });

  test('get retorna pedido quando encontra', async () => {
    Order.findByPk.mockResolvedValue({ id: 2 });
    const res = await OrderService.get(2);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe(2);
  });

  test('getAll filtra por seller e shopper', async () => {
    Order.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await OrderService.getAll(5, 7);
    expect(res.success).toBe(true);
    expect(Order.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ seller_id: 5, shopper_id: 7 }) }));
  });

  test('delete retorna 404 quando não encontra', async () => {
    Order.findByPk.mockResolvedValue(null);
    const res = await OrderService.delete(123);
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
  });

  test('update retorna erro quando pedido não encontrado', async () => {
    Order.findByPk.mockResolvedValue(null);
    const res = await OrderService.update(321, { value: 10 });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/não encontrado/i);
  });

  test('delete remove quando encontra', async () => {
    const destroy = jest.fn().mockResolvedValue({});
    Order.findByPk.mockResolvedValue({ id: 3, destroy });
    const res = await OrderService.delete(3);
    expect(res.success).toBe(true);
    expect(destroy).toHaveBeenCalled();
  });
});

// Casos adicionais para elevar cobertura
describe('OrderService - cobertura adicional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('get retorna erro quando id não é fornecido', async () => {
    const res = await OrderService.get();
    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/ID.*obrigatório/i);
  });

  test('getAll sem filtros retorna todos', async () => {
    Order.findAll.mockResolvedValue([{ id: 1 }]);
    const res = await OrderService.getAll();
    expect(res.success).toBe(true);
    expect(Order.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  test('getAll apenas com shopper (customerId) aplica filtro shopper_id', async () => {
    Order.findAll.mockResolvedValue([{ id: 1 }]);
    const res = await OrderService.getAll(null, 77);
    expect(res.success).toBe(true);
    expect(Order.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ shopper_id: 77 }) }));
  });

  test('update com troca de shopper e seller valida existentes e atualiza', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn(), toJSON: () => ({ id: 1 }) };
    Order.findByPk.mockResolvedValue(existing);
    const ShopperModel = require('../../models/Shopper');
    const SellerModel = require('../../models/Seller');
    ShopperModel.findByPk.mockResolvedValue({ id: 8 });
    SellerModel.findByPk.mockResolvedValue({ id: 9 });
    const res = await OrderService.update(1, { shopper_id: 8, seller_id: 9, product_id: 10, customer_info: { a: 1 }, nuvemshop: { b: 2 }, metadata: { c: 3 } });
    expect(res.success).toBe(true);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ shopper_id: 8, seller_id: 9, product_id: 10, customer_info: { a: 1 }, nuvemshop: { b: 2 }, metadata: { c: 3 } }));
  });

  test('update falha quando novo shopper não existe', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn() };
    Order.findByPk.mockResolvedValue(existing);
    const ShopperModel = require('../../models/Shopper');
    ShopperModel.findByPk.mockResolvedValue(null);
    const res = await OrderService.update(1, { shopper_id: 999 });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Comprador.*não encontrado/i);
  });

  test('update falha quando novo seller não existe', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn() };
    Order.findByPk.mockResolvedValue(existing);
    const SellerModel = require('../../models/Seller');
    SellerModel.findByPk.mockResolvedValue(null);
    const res = await OrderService.update(1, { seller_id: 999 });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Vendedor.*não encontrado/i);
  });

  test('create retorna erro quando Order.create lança exceção', async () => {
    const ProductModel = require('../../models/Product');
    const ShopperModel = require('../../models/Shopper');
    const SellerModel = require('../../models/Seller');
    ProductModel.findByPk.mockResolvedValue({ id: 10, seller_id: 5 });
    ShopperModel.findByPk.mockResolvedValue({ id: 7 });
    SellerModel.findByPk.mockResolvedValue({ id: 5 });
    Order.create.mockRejectedValue(new Error('db error'));
    const res = await OrderService.create({ shopper_id: 7, product_id: 10, value: 99.9, customer_info: {} });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/db error/i);
  });

  test('getAll retorna erro quando findAll lança exceção', async () => {
    Order.findAll.mockRejectedValue(new Error('db down'));
    const res = await OrderService.getAll();
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/db down/i);
  });

  test('delete retorna erro quando destroy lança exceção', async () => {
    const destroy = jest.fn().mockRejectedValue(new Error('cannot delete'));
    Order.findByPk.mockResolvedValue({ id: 3, destroy });
    const res = await OrderService.delete(3);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/cannot delete/i);
  });

  test('get retorna erro quando findByPk lança exceção', async () => {
    Order.findByPk.mockRejectedValue(new Error('db get error'));
    const res = await OrderService.get(1);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/db get error/i);
  });

  test('update retorna erro quando update lança exceção', async () => {
    const existing = { id: 1, seller_id: 5, shopper_id: 7, update: jest.fn().mockRejectedValue(new Error('upd fail')) };
    Order.findByPk.mockResolvedValue(existing);
    const res = await OrderService.update(1, { value: 10 });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/upd fail/i);
  });

  test('delete retorna erro quando findByPk lança exceção', async () => {
    Order.findByPk.mockRejectedValue(new Error('db find error'));
    const res = await OrderService.delete(3);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/db find error/i);
  });
});
