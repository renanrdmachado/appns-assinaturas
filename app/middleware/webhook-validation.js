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

        // 1) Validar assinatura HMAC
        if (!validateSignature(req, res)) return;

        // 2) Validar estrutura do payload
        if (!validateStructure(req, res, requiredFields)) return;

        console.log('✅ Webhook validado com sucesso');
        next();
    };
};

/**
 * Valida assinatura HMAC do webhook Nuvemshop
 */
function timingSafeEqualHex(aHex, bHex) {
    try {
        const a = Buffer.from(String(aHex).trim().toLowerCase(), 'hex');
        const b = Buffer.from(String(bHex).trim().toLowerCase(), 'hex');
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

function validateSignature(req, res) {
    // Permitir desabilitar validação via env em cenários de debug
    if (process.env.NUVEMSHOP_WEBHOOK_VERIFY_DISABLED === 'true') {
        console.log('⚠️ Validação de assinatura desabilitada por NUVEMSHOP_WEBHOOK_VERIFY_DISABLED=true');
        return true;
    }

    // Header (case-insensitive). Em Node, headers ficam lowercased
    const headerSig = req.headers['x-linkedstore-hmac-sha256'] || req.headers['http_x_linkedstore_hmac_sha256'];
    if (!headerSig) {
        console.error('❌ Assinatura ausente: x-linkedstore-hmac-sha256');
        res.status(401).json({ success: false, message: 'Assinatura ausente' });
        return false;
    }

    // Segredo exclusivo: usar somente NS_CLIENT_SECRET
    const secret = process.env.NS_CLIENT_SECRET;

    if (!secret) {
    console.error('❌ Segredo do webhook não configurado (NS_CLIENT_SECRET)');
        res.status(500).json({ success: false, message: 'Segredo do webhook não configurado' });
        return false;
    }

    // Usar corpo bruto (bytes) para cálculo do HMAC
    const raw = req.rawBody;
    if (!raw) {
        console.error('❌ rawBody ausente. Configure express.json({ verify }) para capturar o corpo bruto');
        res.status(500).json({ success: false, message: 'rawBody ausente para validação' });
        return false;
    }

    const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    if (!timingSafeEqualHex(headerSig, computed)) {
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
// Webhook de data request exige também o objeto data_request
const customersDataRequestWebhook = nuvemshopWebhook(['store_id', 'customer', 'data_request']);

module.exports = {
    nuvemshopWebhook,
    storeRedactWebhook,
    customersWebhook,
    customersDataRequestWebhook
};
