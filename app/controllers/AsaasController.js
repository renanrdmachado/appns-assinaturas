require('dotenv').config();
const AsaasService = require('../services/AsaasService');

const addCustomer = async (req, res) => {
    try {
        const customer = req.body;
        const result = await AsaasService.addCustomer(customer);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao adicionar cliente', 
            error: error.message 
        });
    }
};

module.exports = {
    addCustomer
};