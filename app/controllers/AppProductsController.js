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
const addProducts = (req,res) => {
    console.log("Controller - AppProductsController/addProducts");

    const Product = require('../models/Product');
    const createProduct = Product.create(req.body);
    console.log("createProduct",createProduct);

    res.status(200).json({ message: 'Controller - AppProductsController/addProducts' });
}

module.exports = {
    getProducts,
    getProductById,
    addProducts
}
