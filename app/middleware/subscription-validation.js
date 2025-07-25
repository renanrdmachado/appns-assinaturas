const subscriptionValidator = require('../utils/subscription-validator');

/**
 * Middleware para validar assinatura do seller nas rotas
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next function
 */
async function validateSellerSubscription(req, res, next) {
    try {
        console.log(`Iniciando validação de assinatura para rota: ${req.method} ${req.path}`);
        // Tentar capturar seller_id de diferentes formas
        let sellerId = req.params.seller_id;
        
        // Se não encontrou, extrair o primeiro número do path (ex: /2/subscriptions -> 2)
        if (!sellerId) {
            const match = req.path.match(/^\/(\d+)(\/|$)/);
            if (match) {
                sellerId = match[1];
                console.log(`Seller ID extraído do path: ${sellerId}`);
            }
        }
        
        console.log(`Seller ID final: ${sellerId}`);
        
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
