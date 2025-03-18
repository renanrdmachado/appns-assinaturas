require('dotenv').config();
const asaasControllers = require('./asaas');

// Exportando todas as funções dos controladores modulares
module.exports = {
    ...asaasControllers
};