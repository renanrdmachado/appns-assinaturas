require('dotenv').config();
const ProductService = require('../services/product.service');

const getProducts = async (req, res) => {
    console.log("Controller - products.controller/getProducts");
    try {
        const sellerId = req.query.sellerId || null;
        const products = await ProductService.getAll(sellerId);
        res.status(200).json({ products });
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
}

const getProductById = async (req, res) => {
    console.log("Controller - products.controller/getProductById");
    try {
        const productId = req.params.id;
        const product = await ProductService.get(productId);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json({ product });
    } catch (error) {
        console.error("Erro ao buscar produto:", error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
}

const addProduct = async (req, res) => {
    try {
        console.log("Controller - products.controller/addProducts");
        const createdProduct = await ProductService.create(req.body);
        res.status(201).json({ message: 'Produto criado com sucesso', product: createdProduct });
    } catch (error) {
        console.error("Erro ao criar produto:", error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
}

const updateProduct = async (req, res) => {
    try {
        console.log("Controller - products.controller/updateProduct");
        const productId = req.params.id;
        const updatedProduct = await ProductService.update(productId, req.body);
        res.status(200).json({ message: 'Produto atualizado com sucesso', product: updatedProduct });
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
}

const deleteProduct = async (req, res) => {
    try {
        console.log("Controller - products.controller/deleteProduct");
        const productId = req.params.id;
        await ProductService.delete(productId);
        res.status(200).json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
}

module.exports = {
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct
}
