require('dotenv').config();
const OrderService = require('../services/order.service');

// Listar todos os pedidos
const index = async (req, res) => {
    console.log("Controller - OrderController/index");
    try {
        const { sellerId, customerId } = req.query;
        const result = await OrderService.getAll(sellerId, customerId);
        
        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao buscar pedidos',
            error: error.message 
        });
    }
};

// Obter um pedido específico
const show = async (req, res) => {
    console.log("Controller - OrderController/show");
    try {
        const result = await OrderService.get(req.params.id);
        
        if (!result.success) {
            return res.status(result.status || 404).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao buscar pedido',
            error: error.message
        });
    }
};

// Criar um novo pedido
const store = async (req, res) => {
    console.log("Controller - OrderController/store");
    try {
        const result = await OrderService.create(req.body);
        
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        res.status(201).json({ 
            success: true,
            message: 'Pedido criado com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error('Erro ao criar pedido:', error.message);
        res.status(500).json({
            success: false, 
            message: 'Falha ao criar pedido',
            error: error.message
        });
    }
};

// Atualizar um pedido existente
const update = async (req, res) => {
    console.log("Controller - OrderController/update");
    try {
        const result = await OrderService.update(req.params.id, req.body);
        
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Pedido atualizado com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao atualizar pedido:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar pedido', 
            error: error.message
        });
    }
};

// Excluir um pedido
const destroy = async (req, res) => {
    console.log("Controller - OrderController/destroy");
    try {
        const result = await OrderService.delete(req.params.id);
        
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error("Erro ao excluir pedido:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir pedido', 
            error: error.message
        });
    }
};

module.exports = {
    index,
    show,
    store,
    update,
    destroy
};
