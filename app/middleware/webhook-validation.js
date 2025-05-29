const crypto = require('crypto');

/**
 * Middleware para validar assinatura de webhooks da Nuvemshop
 * A Nuvemshop envia a assinatura no header X-Tiendanube-Hmac-Sha256
 */
const validateNuvemshopWebhook = (req, res, next) => {
    try {
        const signature = req.headers['x-tiendanube-hmac-sha256'];
        const payload = JSON.stringify(req.body);
        
        // Em produção, usar o webhook secret real fornecido pela Nuvemshop
        const webhookSecret = process.env.NUVEMSHOP_WEBHOOK_SECRET;
        
        if (!webhookSecret) {
            console.warn('⚠️  NUVEMSHOP_WEBHOOK_SECRET não configurado - pulando validação de assinatura');
            return next(); // Em desenvolvimento, pular validação se secret não estiver configurado
        }
        
        if (!signature) {
            console.error('❌ Webhook recusado: Assinatura ausente');
            return res.status(401).json({
                success: false,
                message: 'Assinatura do webhook é obrigatória'
            });
        }
        
        // Calcular a assinatura esperada
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');
        
        // Comparar assinaturas de forma segura
        const providedSignature = signature.replace('sha256=', '');
        
        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        )) {
            console.error('❌ Webhook recusado: Assinatura inválida');
            return res.status(401).json({
                success: false,
                message: 'Assinatura do webhook inválida'
            });
        }
        
        console.log('✅ Webhook validado: Assinatura correta');
        next();
        
    } catch (error) {
        console.error('❌ Erro na validação do webhook:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro interno na validação do webhook'
        });
    }
};

/**
 * Middleware mais simples para validação básica de estrutura dos dados LGPD
 */
const validateLgpdWebhookStructure = (expectedFields) => {
    return (req, res, next) => {
        try {
            const body = req.body;
            
            if (!body) {
                return res.status(400).json({
                    success: false,
                    message: 'Corpo da requisição é obrigatório'
                });
            }
            
            // Verificar campos obrigatórios
            for (const field of expectedFields) {
                if (!body[field]) {
                    return res.status(400).json({
                        success: false,
                        message: `Campo '${field}' é obrigatório`
                    });
                }
            }
            
            console.log('✅ Estrutura do webhook LGPD validada');
            next();
            
        } catch (error) {
            console.error('❌ Erro na validação da estrutura LGPD:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Erro interno na validação da estrutura'
            });
        }
    };
};

/**
 * Middleware específico para store/redact
 */
const validateStoreRedactWebhook = validateLgpdWebhookStructure(['shop_id', 'shop_domain']);

/**
 * Middleware específico para customers/redact e customers/data_request
 */
const validateCustomersWebhook = validateLgpdWebhookStructure(['shop_id', 'customer']);

/**
 * Middleware para log de webhooks recebidos (útil para debug e auditoria)
 */
const logWebhookReceived = (webhookType) => {
    return (req, res, next) => {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;
        
        console.log(`📩 [${timestamp}] Webhook LGPD recebido:`);
        console.log(`   Tipo: ${webhookType}`);
        console.log(`   IP: ${ip}`);
        console.log(`   User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
        console.log(`   Payload: ${JSON.stringify(req.body, null, 2)}`);
        
        next();
    };
};

module.exports = {
    validateNuvemshopWebhook,
    validateLgpdWebhookStructure,
    validateStoreRedactWebhook,
    validateCustomersWebhook,
    logWebhookReceived
};
