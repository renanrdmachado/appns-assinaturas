const SellerService = require('../../../services/seller.service');
const Seller = require('../../../models/Seller');
const User = require('../../../models/User');
const UserData = require('../../../models/UserData');

jest.mock('../../../models/Seller', () => ({ create: jest.fn(), findOne: jest.fn() }));
jest.mock('../../../models/User', () => ({ create: jest.fn() }));
jest.mock('../../../models/UserData', () => ({ create: jest.fn() }));

describe('Seller OAuth -> cria UserData vazio e associa ao User', () => {
  afterEach(() => jest.clearAllMocks());

  it('ensureSellerExistsFromOAuth cria User, UserData e Seller com include válido', async () => {
    Seller.findOne.mockResolvedValue(null);
    UserData.create.mockResolvedValue({ id: 10 });
    User.create.mockResolvedValue({ id: 20 });
    Seller.create.mockResolvedValue({ id: 30, user_id: 20 });

    const res = await SellerService.ensureSellerExistsFromOAuth('6300987', { name: 'Loja X', email: 'x@y.com' }, 'tok');

    expect(UserData.create).toHaveBeenCalledWith({});
    expect(User.create).toHaveBeenCalledWith({ username: 'Loja X', email: 'x@y.com', password: null, user_data_id: 10 });
    expect(Seller.create).toHaveBeenCalledWith(expect.objectContaining({
      nuvemshop_id: '6300987',
      user_id: 20
    }));

    expect(res.success).toBe(true);
  });
});
