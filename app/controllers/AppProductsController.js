require('dotenv').config();
const axios = require('axios');

const getProducts = (req,res) => {
    console.log("Controller - AppProductsController/getProducts");
    res.status(200).json({ message: 'Controller - AppProductsController/getProducts' });
}
const getProductById = (req,res) => {
    console.log("Controller - AppProductsController/getProductById");
    res.status(200).json({ message: 'Controller - AppProductsController/getProductById' });
}
const addProduct = async (req,res) => {
    try {
        console.log("Controller - AppProductsController/addProducts");
        const Product = require('../models/Product');
        const createProduct = await Product.create(req.body);
        console.log("createProduct", createProduct);
        res.status(201).json({ message: 'Produto criado com sucesso', product: createProduct });
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
