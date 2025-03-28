const SubscriptionService = require('../../services/asaas/subscription.service');
const { formatError, createError } = require('../../utils/errorHandler');

class SubscriptionController {
    /**
     * Lista todas as assinaturas no Asaas
     */
    async index(req, res) {
        try {
            // Extrair filtros da query
            const filters = {
                customer: req.query.customer,
                billingType: req.query.billingType,
                offset: req.query.offset,
                limit: req.query.limit
            };
            
            const result = await SubscriptionService.getAll(filters);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao listar assinaturas:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Obtém detalhes de uma assinatura específica do Asaas
     */
    async show(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID da assinatura é obrigatório', 400));
            }
            
            const result = await SubscriptionService.get(id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao buscar assinatura ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Cria uma nova assinatura no Asaas
     */
    async store(req, res) {
        try {
            const subscriptionData = req.body;
            
            if (!subscriptionData) {
                return res.status(400).json(createError('Dados da assinatura são obrigatórios', 400));
            }
            
            const result = await SubscriptionService.create(subscriptionData);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(201).json({
                success: true,
                message: 'Assinatura criada com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error('Erro ao criar assinatura:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Atualiza uma assinatura existente no Asaas
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const subscriptionData = req.body;
            
            if (!id) {
                return res.status(400).json(createError('ID da assinatura é obrigatório', 400));
            }
            
            if (!subscriptionData) {
                return res.status(400).json(createError('Dados da assinatura são obrigatórios', 400));
            }
            
            const result = await SubscriptionService.update(id, subscriptionData);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Assinatura atualizada com sucesso',
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao atualizar assinatura ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Remove uma assinatura do Asaas
     */
    async destroy(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json(createError('ID da assinatura é obrigatório', 400));
            }
            
            const result = await SubscriptionService.delete(id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                message: 'Assinatura removida com sucesso'
            });
        } catch (error) {
            console.error(`Erro ao remover assinatura ID ${req.params.id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Lista assinaturas por cliente
     */
    async listByCustomer(req, res) {
        try {
            const { customer_id } = req.params;
            
            if (!customer_id) {
                return res.status(400).json(createError('ID do cliente é obrigatório', 400));
            }
            
            const result = await SubscriptionService.getByCustomerId(customer_id);
            
            // Verificar se a operação foi bem-sucedida
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error(`Erro ao listar assinaturas do cliente ID ${req.params.customer_id}:`, error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new SubscriptionController();
