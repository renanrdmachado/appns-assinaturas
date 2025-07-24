const subscriptionValidator = require('../../utils/subscription-validator');

/**
 * Middleware para validar assinatura do seller nas rotas
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next function
 */
async function validateSellerSubscription(req, res, next) {
    try {
        const sellerId = req.params.seller_id;
        
        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: 'ID do seller é obrigatório',
                status: 400
            });
        }

        const subscriptionCheck = await subscriptionValidator.checkSubscriptionMiddleware(sellerId);
        
        if (!subscriptionCheck.success) {
            return res.status(subscriptionCheck.status || 403).json(subscriptionCheck);
        }

        // Adicionar informações da assinatura ao request para uso nos controllers
        req.sellerSubscription = subscriptionCheck.subscription;
        
        next();
    } catch (error) {
        console.error('Erro no middleware de validação de assinatura:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            status: 500
        });
    }
}

module.exports = validateSellerSubscription;
