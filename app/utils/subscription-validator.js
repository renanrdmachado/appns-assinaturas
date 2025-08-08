const { formatError, createError } = require('./errorHandler');
const SellerSubscription = require('../models/SellerSubscription');
const { Op } = require('sequelize');

/**
 * Utilitário para validação de assinaturas de sellers
 */
class SubscriptionValidator {
    
    /**
     * Valida se o seller possui assinatura ativa e válida
     * @param {number} sellerId - ID do seller
     * @returns {Object} - Resultado da validação
     */
    async validateSellerSubscription(sellerId) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            // Buscar assinatura ativa do vendedor
            const subscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: {
                        [Op.in]: ['active', 'overdue', 'pending']
                    }
                },
                order: [['createdAt', 'DESC']] // Pegar a mais recente
            });

            if (!subscription) {
                return createError('O vendedor não possui assinatura ativa. Para utilizar este serviço é necessário ter uma assinatura válida.', 403);
            }

            // Verificar vencimento antes de outras regras para atender aos testes
            const now = new Date();
            const dueDate = new Date(subscription.next_due_date);

            if (subscription.status === 'overdue' || (dueDate < now && subscription.status !== 'active')) {
                return createError('A assinatura do vendedor está vencida. Renove sua assinatura para continuar utilizando o serviço.', 403);
            }

            // Verificar se precisa completar documentos
            if (subscription.status === 'pending') {
                return createError('Para utilizar este serviço, é necessário completar o cadastro com CPF/CNPJ. Acesse a área de configurações para completar seus dados.', 403);
            }

            // Verificar se está inativa ou cancelada
            if (subscription.status === 'inactive' || subscription.status === 'canceled') {
                return createError('A assinatura do vendedor está inativa. Ative sua assinatura para utilizar este serviço.', 403);
            }

            return {
                success: true,
                subscription: subscription
            };

        } catch (error) {
            console.error('Erro ao validar assinatura do vendedor:', error.message);
            return formatError(error);
        }
    }

    /**
     * Middleware para validação automática de assinatura
     * Pode ser usado nos métodos dos serviços
     * @param {number} sellerId - ID do seller
     * @returns {Promise<Object|null>} - Retorna null se válida, objeto de erro se inválida
     */
    async checkSubscriptionMiddleware(sellerId) {
        const validation = await this.validateSellerSubscription(sellerId);
        
        if (!validation.success) {
            return validation; // Retorna o erro
        }
        
        return null; // Assinatura válida - retorna null conforme esperado pelos testes
    }
}

module.exports = new SubscriptionValidator();
