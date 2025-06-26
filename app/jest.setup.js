// Configurações globais para os testes

// Configurar timeout padrão para operações assíncronas
jest.setTimeout(10000);

// Mock de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test_db';
process.env.DB_PORT = '3306';
process.env.DB_DIALECT = 'mysql';
process.env.DB_PASS = 'test';
process.env.DB_NAME = 'test_db';

// Lidar com problemas de encoding do MySQL
process.env.DB_CHARSET = 'utf8mb4';
process.env.DB_COLLATE = 'utf8mb4_unicode_ci';

// Mock global para o Sequelize
jest.mock('./config/database', () => {
  const mockSequelize = {
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
      sync: jest.fn().mockResolvedValue(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    }),
    transaction: jest.fn(cb => {
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue()
      };
      
      if (cb) {
        return cb(mockTransaction);
      }
      
      return Promise.resolve(mockTransaction);
    }),
    models: {},
    sync: jest.fn().mockResolvedValue()
  };

  return mockSequelize;
});
