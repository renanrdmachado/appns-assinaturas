require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasValidator = require('../../helpers/AsaasValidator');
const { formatError } = require('../../utils/errorHandler');

class CustomerService {
    async addCustomer(customerData) {
        try {
            AsaasValidator.validateCustomerData(customerData);

            // Verificar se o cliente já existe
            const params = new URLSearchParams();
            params.append('cpfCnpj', customerData.cpfCnpj);
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });

            if (items.totalCount === 0) {
                const created = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'customers',
                    data: customerData
                });
                return { success: true, data: created };
            } else {
                const error = new Error('Cliente já existe');
                error.name = 'CustomerExistsError';
                throw error;
            }
        } catch (error) {
            return formatError(error);
        }
    }

    async getCustomers(filters) {
        try {
            const params = new URLSearchParams();
            for (const key of Object.keys(filters)) {
                if (filters[key]) params.append(key, filters[key]);
            }
            return await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'customers',
                params
            });
        } catch (error) {
            return formatError(error);
        }
    }

    async updateCustomer(customerId, customerData) {
        try {
            if (!customerId) {
                throw new Error('Customer ID is required');
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `customers/${customerId}`,
                data: customerData
            });

            return { success: true, data: updated };
        } catch (error) {
            return formatError(error);
        }
    }
}

module.exports = new CustomerService();
