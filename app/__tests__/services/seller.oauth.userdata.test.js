const SellerService = require('../../services/seller.service');
const Seller = require('../../models/Seller');
const User = require('../../models/User');
const UserData = require('../../models/UserData');

jest.mock('../../models/Seller', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../models/User', () => ({
  create: jest.fn()
}));

jest.mock('../../models/UserData', () => ({
  create: jest.fn()
}));

describe('Seller OAuth - sempre cria UserData vazio', () => {
  afterEach(() => jest.clearAllMocks());

  it('ensureSellerExistsFromOAuth cria UserData vazio e vincula ao User', async () => {
    require('../../models/Seller').findOne.mockResolvedValue(null);
    require('../../models/UserData').create.mockResolvedValue({ id: 77 });
    require('../../models/User').create.mockResolvedValue({ id: 42 });
    require('../../models/Seller').create.mockResolvedValue({ id: 9 });

    const res = await SellerService.ensureSellerExistsFromOAuth('123', { name: 'Loja X', email: 'x@y.z' }, 'tok');

    expect(require('../../models/UserData').create).toHaveBeenCalledWith({});
    expect(require('../../models/User').create).toHaveBeenCalledWith(expect.objectContaining({ user_data_id: 77 }));
    expect(require('../../models/Seller').create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 42 }));
    expect(res.success).toBe(true);
  });
});
