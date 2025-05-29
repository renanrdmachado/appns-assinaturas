const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
app.set('trust proxy', 1); // Corrige o uso do X-Forwarded-For para rate limit atrás de proxy
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

app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
    console.log(`Started application on port ${port}`);
});