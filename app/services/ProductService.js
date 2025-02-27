const Product = require('../models/Product');

class ProductService {
    async get(req) {
        console.log(req);
        if (!req.query.id)
            return null;
            
        try {
            const product = await Product.findOne({
                where: { nuvemshop_id: req.query.id },
            });
            console.log("Service / Product: ", product);
            return product;
        } catch (error) {
            console.error('Erro ao buscar produto:', error.message);
            throw error;
        }
    }

    async create(data) {
        console.log('Product - creating...');
        try {
            const product = await Product.create({
                seller_id: data.seller_id,
                name: data.name,
                price: data.price,
                stock: data.stock,
                sku: data.sku,
                description: data.description,
                categories: data.categories,
                images: data.images
            });
            
            console.log('Product created:', product.toJSON());
            return product.toJSON();
        } catch (error) {
            console.error('Erro ao criar produto:', error.message);
            throw error;
        }
    }
}

module.exports = new ProductService();
