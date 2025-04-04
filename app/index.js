const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const port = 10000;

// Configuração do CORS
app.use(cors({
    origin: ['http://localhost:5173'], // Origem da aplicação Vue.js
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/', routes);

app.listen(port, () => {
    console.log(`Started application on port ${port}`);
});