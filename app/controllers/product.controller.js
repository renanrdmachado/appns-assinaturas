require('dotenv').config();
const ProductService = require('../services/product.service');

// Listar todos os produtos
const index = async (req, res) => {
    console.log("Controller - ProductController/index");
    try {
        // Adapte esta chamada para seu serviço
        const products = await ProductService.getAll();
        res.status(200).json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error.message);
        res.status(500).json({ error: 'Falha ao buscar produtos' });
    }
};

// Obter um produto específico
const show = async (req, res) => {
    console.log("Controller - ProductController/show");
    try {
        // Adapte esta chamada para seu serviço
        const product = await ProductService.get(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error('Erro ao buscar produto:', error.message);
        res.status(500).json({ error: 'Falha ao buscar produto' });
    }
};

// Criar um novo produto
const store = async (req, res) => {
    console.log("Controller - ProductController/store");
    try {
        // Adapte esta chamada para seu serviço
        const product = await ProductService.create(req.body);
        res.status(201).json({ 
            success: true,
            message: 'Produto criado com sucesso', 
            data: product 
        });
    } catch (error) {
        console.error('Erro ao criar produto:', error.message);
        res.status(500).json({
            success: false, 
            message: 'Falha ao criar produto',
            error: error.message
        });
    }
};

// Atualizar um produto existente
const update = async (req, res) => {
    console.log("Controller - ProductController/update");
    try {
        // Adapte esta chamada para seu serviço
        const updatedProduct = await ProductService.update(req.params.id, req.body);
        res.status(200).json({ 
            success: true, 
            message: 'Produto atualizado com sucesso', 
            data: updatedProduct 
        });
    } catch (error) {
        console.error("Erro ao atualizar produto:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar produto', 
            error: error.message
        });
    }
};

// Excluir um produto
const destroy = async (req, res) => {
    console.log("Controller - ProductController/destroy");
    try {
        // Adapte esta chamada para seu serviço
        await ProductService.delete(req.params.id);
        res.status(200).json({ 
            success: true, 
            message: `Produto excluído com sucesso`
        });
    } catch (error) {
        console.error("Erro ao excluir produto:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir produto', 
            error: error.message
        });
    }
};

// Buscar seller pelo ID do produto
const getSellerByProductId = async (req, res) => {
    console.log("Controller - ProductController/getSellerByProductId");
    console.log("req.params:", req.params); // Debug
    console.log("req.url:", req.url); // Debug
    console.log("req.originalUrl:", req.originalUrl); // Debug
    try {
        const { id } = req.params; // Mudança aqui: usar 'id' em vez de 'productId'
        console.log("Extracted id:", id); // Debug
        
        if (!id) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do produto é obrigatório' 
            });
        }

        console.log("Calling ProductService.getSellerByProductId with id:", id); // Debug
        const result = await ProductService.getSellerByProductId(id);
        
        if (!result.success) {
            return res.status(result.status || 404).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar seller pelo produto:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao buscar seller pelo produto',
            error: error.message 
        });
    }
};

module.exports = {
    index,
    show,
    store,
    update,
    destroy,
    getSellerByProductId
};
