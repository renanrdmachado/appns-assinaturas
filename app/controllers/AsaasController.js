require('dotenv').config();
const axios = require('axios');

const addCustomer = (req,res) => {

    var customer = req.body;
    
    const options = {
        method: 'GET',
        url: process.env.AS_URL+'/customers?cpfCnpj='+customer.cpfCnpj,
        headers: {
            'Accept': 'application/json',
            'access_token': process.env.AS_TOKEN
        }
    };
    
    axios(options)
        .then(async response => {
            var items = response.data;
            if( items.totalCount===0 ) {
                var createCustomer = axios.post(
                    process.env.AS_URL+'/customers',
                    customer,{
                        headers: {
                            'Accept': 'application/json',
                            'access_token': process.env.AS_TOKEN
                        }
                    });
                console.log("createCustomer",await createCustomer);
            } else {
                console.log('hasClient');
            }
        })
        .catch(error => {
            console.error(error);
        });
    // [CORRIGIR] ESTAMOS COM ERRO NO "RES"
    res.send("teste");
}

module.exports = {
    addCustomer
}