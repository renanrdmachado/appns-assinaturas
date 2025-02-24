const {Product} = require('../database/database'); // import the database

const get = async (req) => {
    console.log(req);
    if( !req.query.id )
        return;
    const product = await Product.findOne({
        where: { nuvemshop_id: req.query.id },
    });
    console.log("Model / Product: ",product);
    return product;
}

const create = ( data ) => {
    console.log('Product - creating...');

    Product.create({
        seller_id: data.seller_id,
        name: data.name,
        price: data.price,
        stock: data.stock,
        sku: data.sku,
        description: data.description,
        categories: data.categories,
        images: data.images
    }).then(Product => {
        console.log('Product created - before:', Product.toJSON());
        var dataJson = Product.toJSON();
        console.log('Product created:', dataJson);
        return dataJson;
    });
}

module.exports = {
    get,
    create
}