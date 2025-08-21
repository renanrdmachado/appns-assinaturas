const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
app.set('trust proxy', true); // confiar no proxy para req.ip e X-Forwarded-For
const port = 10000;

// Configuração do CORS
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://assinaturas.appns.com.br'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP por janela
    message: { success: false, message: 'Muitas requisições, tente novamente mais tarde.' }
});

app.use(limiter);

// Captura corpo bruto para validação HMAC de webhooks
app.use(express.json({
    verify: (req, res, buf) => {
        // Guardar raw body apenas para webhooks da Nuvemshop (evita overhead geral)
        if (req.originalUrl.startsWith('/ns') || req.originalUrl.startsWith('/webhook')) {
            req.rawBody = Buffer.from(buf);
        }
    }
}));
app.use('/', routes);

app.listen(port, () => {
    console.log(`Started application on port ${port}`);
});