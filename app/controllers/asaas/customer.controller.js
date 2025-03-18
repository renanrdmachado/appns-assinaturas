require('dotenv').config();
const AsaasService = require('../../services/asaas/customer.service');

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

const getCustomers = async (req, res) => {
    try {
        const filters = req.query; // { offset, limit, name, email, cpfCnpj, groupName, externalReference }
        const result = await AsaasService.getCustomers(filters);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar clientes Asaas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar clientes Asaas',
            error: error.message
        });
    }
};

/**
 * Updates a customer in Asaas
 * @param {Object} req - Request object with customer ID and updated data
 * @param {Object} res - Response object
 */
const updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customerData = req.body;

    const result = await AsaasService.updateCustomer(customerId, customerData);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating customer:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
};

module.exports = {
    addCustomer,
    getCustomers,
    updateCustomer
};
