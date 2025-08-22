const UserService = require('../../services/user.service');
const User = require('../../models/User');
const UserData = require('../../models/UserData');

jest.mock('../../models/User', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/UserData', () => ({
  create: jest.fn()
}));

describe('UserService associations - todo User tem UserData', () => {
  afterEach(() => jest.clearAllMocks());

  it('create deve sempre criar UserData e vincular ao User', async () => {
    // Arrange
    const mockUD = { id: 123 };

    require('../../models/UserData').create.mockResolvedValue(mockUD);
    require('../../models/User').create.mockResolvedValue({ id: 1 });
    require('../../models/User').findByPk.mockResolvedValue({ id: 1, user_data_id: 123, userData: mockUD });

    // Act
    const result = await UserService.create({ email: 'a@b.com', username: 'x' });

    // Assert
    expect(require('../../models/UserData').create).toHaveBeenCalledWith({
      cpfCnpj: null,
      mobilePhone: null,
      address: null,
      addressNumber: null,
      province: null,
      postalCode: null,
      birthDate: null
    }, expect.any(Object));

    expect(require('../../models/User').create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'a@b.com',
      user_data_id: 123
    }), expect.any(Object));

    expect(result.success).toBe(true);
    expect(result.data.userData).toEqual(mockUD);
  });
});
