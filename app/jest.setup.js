// Configurações globais para os testes

// Configurar timeout padrão para operações assíncronas
jest.setTimeout(10000);

// Mock de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test_db';
process.env.DB_PASS = 'test';
process.env.DB_NAME = 'test_db';
