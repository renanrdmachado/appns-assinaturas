require('dotenv').config();
const AsaasCustomerService = require('../../services/asaas/customer.service');
const { formatError, createError } = require('../../utils/errorHandler');

/**
 * Controller para gerenciar clientes no Asaas, seguindo padrão RESTful
 */
class CustomerController {
    /**
     * Lista todos os clientes do Asaas
     */
    async listAll(req, res) {
        try {
            // Extrair filtros da query
            const filters = { ...req.query };
            
            const result = await AsaasCustomerService.getAll(filters);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao listar clientes:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Obtém detalhes de um cliente específico
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID do cliente é obrigatório', 400));
            }
            
            const result = await AsaasCustomerService.get(id);
            
            if (!result.success) {
                return res.status(result.status || 404).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar cliente ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Cria ou atualiza um cliente no Asaas
     */
    async createOrUpdate(req, res) {
        try {
            const customerData = req.body;
            const { groupName } = req.params;
            
            const result = await AsaasCustomerService.createOrUpdate(customerData, groupName);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json({
                success: true,
                message: 'Cliente criado ou atualizado com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao criar ou atualizar cliente:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Remove um cliente do Asaas
     */
    async remove(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID do cliente é obrigatório', 400));
            }
            
            const result = await AsaasCustomerService.delete(id);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Cliente removido com sucesso'
            });
        } catch (error) {
            console.error(`Erro ao remover cliente ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca cliente por CPF/CNPJ
     */
    async findByCpfCnpj(req, res) {
        try {
            const { cpfCnpj } = req.params;
            const { groupName } = req.query;
            
            // Validar grupo se fornecido
            if (groupName && 
                ![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
                return res.status(400).json(createError(
                    `Grupo inválido. Use ${AsaasCustomerService.SELLER_GROUP} ou ${AsaasCustomerService.SHOPPER_GROUP}`,
                    400
                ));
            }
            
            const result = await AsaasCustomerService.findByCpfCnpj(cpfCnpj, groupName);
            
            if (!result.success) {
                return res.status(result.status || 404).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Lista clientes por grupo
     */
    async listByGroup(req, res) {
        try {
            const { groupName } = req.params;
            const filters = { ...req.query }; // outros filtros
            
            if (!groupName || 
                ![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
                return res.status(400).json(createError(
                    `Grupo inválido. Use ${AsaasCustomerService.SELLER_GROUP} ou ${AsaasCustomerService.SHOPPER_GROUP}`,
                    400
                ));
            }
            
            const result = await AsaasCustomerService.listByGroup(groupName, filters);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao listar clientes por grupo:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca cliente por referência externa
     */
    async findByExternalReference(req, res) {
        try {
            const { externalId } = req.params;
            const { groupName } = req.query;
            
            // Validar grupo se fornecido
            if (groupName && 
                ![AsaasCustomerService.SELLER_GROUP, AsaasCustomerService.SHOPPER_GROUP].includes(groupName)) {
                return res.status(400).json(createError(
                    `Grupo inválido. Use ${AsaasCustomerService.SELLER_GROUP} ou ${AsaasCustomerService.SHOPPER_GROUP}`,
                    400
                ));
            }
            
            const result = await AsaasCustomerService.findByExternalReference(externalId, groupName);
            
            if (!result.success) {
                return res.status(result.status || 404).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao buscar cliente por referência externa:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new CustomerController();
