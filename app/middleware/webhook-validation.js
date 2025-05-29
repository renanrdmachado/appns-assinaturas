const crypto = require('crypto');

/**
 * Middleware único para webhooks Nuvemshop que resolve TUDO de uma vez:
 * - Captura raw body para validação de assinatura
 * - Parseia JSON mantendo raw body
 * - Valida assinatura HMAC
 * - Valida estrutura do payload
 * - Log de auditoria
 */
const nuvemshopWebhook = (requiredFields = []) => {
    return [
        // Primeiro: capturar raw body
        (req, res, next) => {
            req.rawBody = '';
            req.setEncoding('utf8');
            
            req.on('data', chunk => {
                req.rawBody += chunk;
            });
            
            req.on('end', () => {
                next();
            });
            
            req.on('error', (error) => {
                console.error('❌ Erro na requisição do webhook:', error);
                res.status(400).json({
                    success: false,
                    message: 'Erro ao processar requisição'
                });
            });
        },
        
        // Segundo: processar e validar
        (req, res, next) => {
            try {
                // Parsear JSON do raw body
                req.body = JSON.parse(req.rawBody);
                
                // Log de auditoria
                console.log(`📩 Webhook Nuvemshop recebido:`, {
                    url: req.originalUrl,
                    method: req.method,
                    body: req.body,
                    signature: req.headers['x-linkedstore-hmac-sha256'] ? '[PRESENTE]' : '[AUSENTE]',
                    timestamp: new Date().toISOString()
                });
                
                // Validar assinatura
                if (!validateSignature(req, res)) return;
                
                // Validar estrutura
                if (!validateStructure(req, res, requiredFields)) return;
                
                console.log('✅ Webhook validado com sucesso');
                next();
                
            } catch (error) {
                console.error('❌ Erro ao processar webhook:', {
                    error: error.message,
                    rawBody: req.rawBody,
                    url: req.originalUrl
                });
                return res.status(400).json({ 
                    success: false, 
                    message: 'Formato JSON inválido',
                    details: error.message
                });
            }
        }
    ];
};

/**
 * Valida assinatura HMAC do webhook Nuvemshop
 */
function validateSignature(req, res) {
    const signature = req.headers['x-linkedstore-hmac-sha256'];
    const webhookSecret = process.env.NUVEMSHOP_WEBHOOK_SECRET;
    
    // Em desenvolvimento, pular validação se secret não configurado
    if (!webhookSecret || webhookSecret === 'your_webhook_secret_here') {
        console.warn('⚠️  NUVEMSHOP_WEBHOOK_SECRET não configurado - pulando validação');
        return true;
    }
    
    if (!signature) {
        console.error('❌ Assinatura ausente');
        res.status(401).json({ success: false, message: 'Assinatura obrigatória' });
        return false;
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody, 'utf8')
        .digest('hex');
    
    if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
    )) {
        console.error('❌ Assinatura inválida');
        res.status(401).json({ success: false, message: 'Assinatura inválida' });
        return false;
    }
    
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
