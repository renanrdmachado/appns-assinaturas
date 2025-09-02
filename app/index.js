const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
// Inicializa modelos e associações do Sequelize antes de carregar rotas
require('./models');

const routes = require('./routes');

const app = express();
// Confiar somente no primeiro proxy (ex.: Nginx/Load Balancer) para evitar spoof de IP
// Evita o erro ERR_ERL_PERMISSIVE_TRUST_PROXY do express-rate-limit
app.set('trust proxy', 1);
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
    standardHeaders: true, // usa RateLimit-* headers
    legacyHeaders: false,  // desativa X-RateLimit-* legacy
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
// Health check endpoint para Docker e load balancers
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.use('/', routes);

app.listen(port, () => {
    console.log(`Started application on port ${port}`);
});