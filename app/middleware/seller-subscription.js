const subscriptionValidator = require('../utils/subscription-validator');

/**
 * Middleware para validar assinatura do seller nas rotas específicas
 * Extrai o seller_id do parâmetro da URL e valida a assinatura
 */
const validateSellerSubscription = async (req, res, next) => {
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

        console.log(`Validando assinatura do seller ${sellerId} para rota: ${req.method} ${req.path}`);
        
        const validationResult = await subscriptionValidator.validateSellerSubscription(sellerId);
        
        if (!validationResult.success) {
            console.log(`Assinatura inválida para seller ${sellerId}:`, validationResult.message);
            return res.status(validationResult.status || 403).json(validationResult);
        }

        console.log(`Assinatura válida para seller ${sellerId}, prosseguindo...`);
        
        // Armazenar dados da assinatura no request para uso posterior se necessário
        req.sellerSubscription = validationResult.subscription;
        
        next();
    } catch (error) {
        console.error('Erro no middleware de validação de assinatura:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            status: 500
        });
    }
};

module.exports = {
    validateSellerSubscription
};
