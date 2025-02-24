require('dotenv').config();
const axios = require('axios');
const Seller = require('../models/Seller');

const authorize = async (req,res) => {

    try {
        const response = await axios.post('https://www.nuvemshop.com.br/apps/authorize/token',{
            'client_id': process.env.NS_CLIENT_ID,
            'client_secret': process.env.NS_CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': req.query.code
        });
        const data = response.data;
        console.log(data);
        if(data.access_token){
            const createSeller = Seller.create(data);
            getAndSaveStoreInfo(data);
            console.log("createSeller",createSeller);
        }


        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
    
}

const getAndSaveStoreInfo = async ( store ) => {
    const axios = require('axios');

    const options = {
        method: 'GET',
        url: 'https://api.nuvemshop.com.br/v1/'+store.user_id+'/store',
        headers: {
            'Authentication': 'bearer '+store.access_token,
            'User-Agent': process.env.NS_APP_NAME
        }
    };

    axios(options)
        .then(response => {
            console.log(response.data);
            Seller.saveStoreInfo(store.user_id,response.data);
        })
        .catch(error => {
            console.error(error);
        });

}

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