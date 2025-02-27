require('dotenv').config();
const ProductService = require('../services/ProductService');

const getProducts = (req,res) => {
    console.log("Controller - AppProductsController/getProducts");
    res.status(200).json({ message: 'Controller - AppProductsController/getProducts' });
}

const getProductById = async (req,res) => {
    console.log("Controller - AppProductsController/getProductById");
    try {
        const product = await ProductService.get(req);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json({ product });
    } catch (error) {
        console.error("Erro ao buscar produto:", error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
}

const addProduct = async (req,res) => {
    try {
        console.log("Controller - AppProductsController/addProducts");
        const createdProduct = await ProductService.create(req.body);
        res.status(201).json({ message: 'Produto criado com sucesso', product: createdProduct });
    } catch (error) {
        console.error("Erro ao criar produto:", error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
}

module.exports = {
    getProducts,
    getProductById,
    addProduct
}
