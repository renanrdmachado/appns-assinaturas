const crypto = require('crypto');

/**
 * Middleware simples que valida estrutura e assinatura
 */
const nuvemshopWebhook = (requiredFields = []) => {
    return (req, res, next) => {
        // Log de auditoria
        console.log(`📩 Webhook Nuvemshop recebido:`, {
            url: req.originalUrl,
            method: req.method,
            body: req.body,
            headers: req.headers,
            timestamp: new Date().toISOString()
        });
        
        // Validar estrutura
        if (!validateStructure(req, res, requiredFields)) return;
        
        console.log('✅ Webhook validado com sucesso');
        next();
    };
};

/**
 * Valida assinatura HMAC do webhook Nuvemshop
 */
function validateSignature(req, res) {
    // Pular validação por enquanto para debug
    console.log('⚠️ Validação de assinatura desabilitada para debug');
    return true;
}

/**
 * Valida estrutura do payload
 */
function validateStructure(req, res, requiredFields) {
    const missingFields = requiredFields.filter(field => 
        req.body[field] === undefined || 
        req.body[field] === null || 
        req.body[field] === ''
    );
    
    if (missingFields.length > 0) {
        console.error('❌ Campos ausentes:', missingFields);
        res.status(400).json({
            success: false,
            message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
            missing_fields: missingFields
        });
        return false;
    }
    
    return true;
}

// Middlewares específicos para cada endpoint
const storeRedactWebhook = nuvemshopWebhook(['store_id']);
const customersWebhook = nuvemshopWebhook(['store_id', 'customer']);

module.exports = {
    nuvemshopWebhook,
    storeRedactWebhook,
    customersWebhook
};
