const crypto = require('crypto');

/**
 * Middleware para capturar o raw body necessário para validação de webhooks
 * Deve ser usado antes do express.json() nas rotas de webhook
 */
const captureRawBody = (req, res, next) => {
    if (req.headers['content-type'] === 'application/json') {
        let rawBody = '';
        req.on('data', chunk => {
            rawBody += chunk.toString();
        });
        req.on('end', () => {
            req.rawBody = rawBody;
            try {
                req.body = JSON.parse(rawBody);
            } catch (error) {
                req.body = {};
            }
            next();
        });
    } else {
        next();
    }
};

/**
 * Middleware para validar assinatura de webhooks da Nuvemshop
 * A Nuvemshop envia a assinatura no header x-linkedstore-hmac-sha256
 * Baseado na documentação oficial: https://tiendanube.github.io/api-documentation/resources/webhook
 */
const validateNuvemshopWebhook = (req, res, next) => {
    try {
        // Header correto conforme documentação da Nuvemshop
        const signature = req.headers['x-linkedstore-hmac-sha256'] || req.headers['http_x_linkedstore_hmac_sha256'];
        
        // Para validação, precisamos do raw body, não do JSON parsed
        // O Express deve estar configurado com express.raw() para webhooks
        const payload = req.rawBody || JSON.stringify(req.body);
        
        // Em produção, usar o webhook secret real fornecido pela Nuvemshop
        const webhookSecret = process.env.NS_CLIENT_SECRET;
        
        if (!webhookSecret) {
            console.warn('⚠️  NS_CLIENT_SECRET não configurado - pulando validação de assinatura');
            return next(); // Em desenvolvimento, pular validação se secret não estiver configurado
        }
        
        if (!signature) {
            console.error('❌ Webhook recusado: Assinatura ausente');
            console.error('❌ Headers recebidos:', Object.keys(req.headers));
            return res.status(401).json({
                success: false,
                message: 'Assinatura do webhook é obrigatória'
            });
        }
        
        // Calcular a assinatura esperada usando o App Secret
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload, 'utf8')
            .digest('hex');
        
        // A Nuvemshop envia a assinatura sem prefixo, apenas o hash
        const providedSignature = signature.toLowerCase();
        
        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        )) {
            console.error('❌ Webhook recusado: Assinatura inválida');
            console.error('❌ Esperado:', expectedSignature);
            console.error('❌ Recebido:', providedSignature);
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
 * Baseado no payload oficial: { store_id: 123 }
 */
const validateStoreRedactWebhook = validateLgpdWebhookStructure(['store_id']);

/**
 * Middleware específico para customers/redact e customers/data_request
 * Baseado no payload oficial: { store_id: 123, customer: {...}, ... }
 */
const validateCustomersWebhook = validateLgpdWebhookStructure(['store_id', 'customer']);

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
    captureRawBody,
    validateNuvemshopWebhook,
    validateLgpdWebhookStructure,
    validateStoreRedactWebhook,
    validateCustomersWebhook,
    logWebhookReceived
};
