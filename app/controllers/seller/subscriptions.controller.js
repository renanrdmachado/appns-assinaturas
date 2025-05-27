const SellerSubscriptionsService = require('../../services/seller/subscriptions.service');
const SellerService = require('../../services/seller.service');
const SubscriptionValidator = require('../../validators/subscription-validator');
const { formatError, createError } = require('../../utils/errorHandler');

class SellerSubscriptionsController {
    /**
     * Lista todas as assinaturas de shoppers de um seller
     */
    async getSubscriptions(req, res) {
        try {
            const { seller_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json(seller);
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await SellerSubscriptionsService.getSellerSubscriptions(
                seller_id,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinaturas dos clientes do vendedor:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Busca uma assinatura específica relacionada a um seller
     */
    async getSubscriptionById(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            const result = await SellerSubscriptionsService.getSellerSubscriptionById(
                seller_id,
                subscription_id
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinatura associada ao vendedor:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
    
    /**
     * Lista todas as assinaturas de um shopper específico de um seller
     */
    async getShopperSubscriptions(req, res) {
        try {
            const { seller_id, shopper_id } = req.params;
            const seller = await SellerService.get(seller_id);
            
            if (!seller.success) {
                return res.status(seller.status || 404).json({ success: false, message: 'Vendedor não encontrado' });
            }
            
            // Converter parâmetros da query
            const params = { ...req.query };
            
            const result = await SellerSubscriptionsService.getSellerShopperSubscriptions(
                seller_id,
                shopper_id,
                params
            );
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar assinaturas do cliente para o vendedor:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }

    /**
     * Atualiza uma assinatura completa
     */
    async updateSubscription(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
            const updateData = req.body;

            // Validar dados de entrada
            try {
                const sanitizedData = SubscriptionValidator.sanitizeUpdateData(updateData);
                SubscriptionValidator.validateUpdateData(sanitizedData);
                req.body = sanitizedData;
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            // Validar se o seller existe
            const seller = await SellerService.get(seller_id);
            if (!seller.success) {
                return res.status(seller.status || 404).json({ 
                    success: false, 
                    message: 'Vendedor não encontrado' 
                });
            }

            // Buscar a assinatura para validar se pode ser editada
            const subscriptionResult = await SellerSubscriptionsService.getSellerSubscriptionById(seller_id, subscription_id);
            if (!subscriptionResult.success) {
                return res.status(subscriptionResult.status || 404).json(subscriptionResult);
            }

            // Validar se a assinatura pode ser editada
            try {
                SubscriptionValidator.validateSubscriptionCanBeEdited(subscriptionResult.data, 'full');
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            const result = await SellerSubscriptionsService.updateSubscription(
                seller_id,
                subscription_id,
                req.body
            );

            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar assinatura:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }

    /**
     * Atualiza apenas o status da assinatura
     */
    async updateSubscriptionStatus(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
            const { status } = req.body;

            // Validar dados de entrada
            try {
                SubscriptionValidator.validateStatusUpdate({ status });
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            // Validar se o seller existe
            const seller = await SellerService.get(seller_id);
            if (!seller.success) {
                return res.status(seller.status || 404).json({ 
                    success: false, 
                    message: 'Vendedor não encontrado' 
                });
            }

            // Buscar a assinatura para validar se pode ser editada
            const subscriptionResult = await SellerSubscriptionsService.getSellerSubscriptionById(seller_id, subscription_id);
            if (!subscriptionResult.success) {
                return res.status(subscriptionResult.status || 404).json(subscriptionResult);
            }

            // Validar se a assinatura pode ter o status alterado
            try {
                SubscriptionValidator.validateSubscriptionCanBeEdited(subscriptionResult.data, 'status');
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            const result = await SellerSubscriptionsService.updateSubscriptionStatus(
                seller_id,
                subscription_id,
                status
            );

            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar status da assinatura:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }

    /**
     * Atualiza método de pagamento da assinatura
     */
    async updatePaymentMethod(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
            const { payment_method } = req.body;

            // Validar dados de entrada
            try {
                SubscriptionValidator.validatePaymentMethodUpdate({ payment_method });
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            // Validar se o seller existe
            const seller = await SellerService.get(seller_id);
            if (!seller.success) {
                return res.status(seller.status || 404).json({ 
                    success: false, 
                    message: 'Vendedor não encontrado' 
                });
            }

            // Buscar a assinatura para validar se pode ser editada
            const subscriptionResult = await SellerSubscriptionsService.getSellerSubscriptionById(seller_id, subscription_id);
            if (!subscriptionResult.success) {
                return res.status(subscriptionResult.status || 404).json(subscriptionResult);
            }

            // Validar se a assinatura pode ser editada
            try {
                SubscriptionValidator.validateSubscriptionCanBeEdited(subscriptionResult.data, 'payment_method');
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            const result = await SellerSubscriptionsService.updateSubscriptionPaymentMethod(
                seller_id,
                subscription_id,
                payment_method
            );

            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar método de pagamento da assinatura:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }

    /**
     * Atualiza preço da assinatura
     */
    async updateSubscriptionPrice(req, res) {
        try {
            const { seller_id, subscription_id } = req.params;
            const { value } = req.body;

            // Validar dados de entrada
            try {
                SubscriptionValidator.validatePriceUpdate({ value });
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            // Validar se o seller existe
            const seller = await SellerService.get(seller_id);
            if (!seller.success) {
                return res.status(seller.status || 404).json({ 
                    success: false, 
                    message: 'Vendedor não encontrado' 
                });
            }

            // Buscar a assinatura para validar se pode ser editada
            const subscriptionResult = await SellerSubscriptionsService.getSellerSubscriptionById(seller_id, subscription_id);
            if (!subscriptionResult.success) {
                return res.status(subscriptionResult.status || 404).json(subscriptionResult);
            }

            // Validar se a assinatura pode ser editada
            try {
                SubscriptionValidator.validateSubscriptionCanBeEdited(subscriptionResult.data, 'price');
            } catch (validationError) {
                return res.status(400).json(formatError(validationError));
            }

            const result = await SellerSubscriptionsService.updateSubscriptionPrice(
                seller_id,
                subscription_id,
                value
            );

            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao atualizar preço da assinatura:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor', 
                error: error.message 
            });
        }
    }
}

module.exports = new SellerSubscriptionsController();