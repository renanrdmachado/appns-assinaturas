require('dotenv').config();
const NsService = require('../services/ns.service');

const authorize = async (req, res) => {
    try {
        const data = await NsService.authorize(req.query.code);
        res.json(data);
    } catch (error) {
        console.error('Error authorizing:', error.message);
        res.status(500).json({ error: 'Failed to authorize' });
    }
};

exports.authorize = authorize;

/*

    1. Instalação do app Nuvemshop

        1.1 Acessar link de instalação do app Nuvemshop
        https://www.nuvemshop.com.br/apps/(app_id)/authorize

        1.2 Pegar o `code` que é retornado na URL após a autorização do app

        1.3 Fazer uma requisição POST para o endpoint de autorização do app
        /POST https://www.nuvemshop.com.br/apps/authorize/token
        'Content-Type: application/json'
        {"client_id": "123", "client_secret": "xxxxxxxx", "grant_type": "authorization_code", "code": "xxxxxxxx" }

        1.4 Pegar o `access_token` e `user_id` que é retornado na resposta da requisição e armazenar para uso posterior no app
    
*/