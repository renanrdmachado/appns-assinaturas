const subscriptionValidator = require('../../utils/subscription-validator');

/**
 * Middleware para validar assinatura do seller nas rotas
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next function
 */
async function validateSellerSubscription(req, res, next) {
    try {
        // Tentar capturar seller_id de diferentes formas
        let sellerId = req.params.seller_id;
        
        // Se não encontrou, tentar extrair da URL manualmente
        if (!sellerId) {
            const pathParts = req.path.split('/');
            const sellerIndex = pathParts.indexOf('seller');
            if (sellerIndex !== -1 && pathParts[sellerIndex + 1]) {
                sellerId = pathParts[sellerIndex + 1];
            }
        }
        
        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: 'ID do seller é obrigatório',
                status: 400
            });
        }

        const subscriptionCheck = await subscriptionValidator.checkSubscriptionMiddleware(sellerId);
        
        if (subscriptionCheck) {
            return res.status(subscriptionCheck.status || 403).json(subscriptionCheck);
        }

        // Buscar informações completas da assinatura para adicionar ao request
        const validationResult = await subscriptionValidator.validateSellerSubscription(sellerId);
        req.sellerSubscription = validationResult.subscription;
        
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
