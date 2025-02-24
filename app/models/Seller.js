const {Seller} = require('../database/database'); // import the database

const get = async (id = null) => {
    if( id ) {
        const seller = await Seller.findOne({
            where: { nuvemshop_id: id },
        });
        console.log("Model / Seller: ",seller);
        return seller;
    } else {
        const seller = await Seller.findAll();
        console.log("Model / Seller: ",seller);
        return seller;
    }
}

const create = ( data ) => {
    console.log('Seller - creating...');

    Seller.upsert({
        nuvemshop_id: data.user_id,
        nuvemshop_info: data,
        nuvemshop_api_token: data.access_token
    }).then(seller => {
        var dataJson = seller[0].dataValues;
        console.log('Seller created:', dataJson);
        return dataJson;
    });
}

const saveStoreInfo = (store,nuvemshop) => {
    console.log("saveStoreInfo  - store", store);
    console.log("saveStoreInfo  - nuvemshop", nuvemshop);
    Seller.upsert({
        nuvemshop_id: store,
        nuvemshop_info: nuvemshop
    }).then(seller => {
        var dataJson = seller[0].dataValues;
        console.log('Seller store info updated:', dataJson);
        return dataJson;
    });
}

module.exports = {
    get,
    create,
    saveStoreInfo
}