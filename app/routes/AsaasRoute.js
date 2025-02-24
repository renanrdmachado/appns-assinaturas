const AsaasController = require('../controllers/AsaasController')

const addCustomer = async (req,res) => {
    await AsaasController.addCustomer(req,res);
}

module.exports = {
    addCustomer
}