const {Order} = require('../database/database'); // import the database

const create = ( data ) => {
    console.log('Order - creating...');

    Order.create({
        seller_id: data.seller_id,
        products: data.products,
        customer_id: data.customer_id,
        customer_info: data.customer_info,
        nuvemshop: data.nuvemshop,
        value: data.value,
        cycle: data.cycle,
    }).then(Order => {
        console.log('Order created - before:', Order.toJSON());
        var dataJson = Order.toJSON();
        console.log('Order created:', dataJson);
        return dataJson;
    });
}

exports.create = create;