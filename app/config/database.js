require('dotenv').config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, // Adicionado para usar a porta do .env
    dialect: process.env.DB_DIALECT
  }
);

// Testar a conexão
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Sincronizar modelos com o banco de dados (criar tabelas se não existirem)
    sequelize.sync({ force: false })
      .then(() => {
        console.log('Tabelas sincronizadas com sucesso.');
      })
      .catch(err => {
        console.error('Erro ao sincronizar tabelas:', err);
      });
  })
  .catch(err => {
    console.error('Não foi possível conectar ao banco de dados:', err);
  });

module.exports = sequelize;
