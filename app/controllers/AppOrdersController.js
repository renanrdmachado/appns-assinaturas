require('dotenv').config();
const OrderService = require('../services/OrderService');

const getOrders = async (req, res) => {
    console.log("Controller - AppOrdersController/getOrders");
    try {
        const sellerId = req.query.seller_id;
        const customerId = req.query.customer_id;
        
        const orders = await OrderService.getAll(sellerId, customerId);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error.message);
        res.status(500).json({ 
            success: false,
            message: 'Falha ao buscar pedidos',
            error: error.message
        });
    }
};

const getOrderById = async (req, res) => {
    console.log("Controller - AppOrdersController/getOrderById");
    try {
        const order = await OrderService.get(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido não encontrado' 
            });
        }
        
        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Erro ao buscar pedido:', error.message);
        res.status(500).json({ 
            success: false,
            message: 'Falha ao buscar pedido',
            error: error.message
        });
    }
};

const addOrder = async (req, res) => {
    console.log("Controller - AppOrdersController/addOrder");
    try {
        const createdOrder = await OrderService.create(req.body);
        res.status(201).json({ 
            success: true,
            message: 'Pedido criado com sucesso', 
            data: createdOrder 
        });
    } catch (error) {
        console.error("Erro ao criar pedido:", error.message);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao criar pedido',
            error: error.message
        });
    }
};

const updateOrder = async (req, res) => {
    console.log("Controller - AppOrdersController/updateOrder");
    try {
        const orderId = req.params.id;
        
        if (!orderId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do pedido é obrigatório' 
            });
        }
        
        // Verificar se o pedido existe
        const existingOrder = await OrderService.get(orderId);
        if (!existingOrder) {
            return res.status(404).json({ 
                success: false, 
                message: `Pedido com ID ${orderId} não encontrado` 
            });
        }
        
        // Atualizar o pedido
        const updatedOrder = await OrderService.update(orderId, req.body);
        
        res.status(200).json({ 
            success: true, 
            message: 'Pedido atualizado com sucesso', 
            data: updatedOrder 
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

const deleteOrder = async (req, res) => {
    console.log("Controller - AppOrdersController/deleteOrder");
    try {
        const orderId = req.params.id;
        
        if (!orderId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do pedido é obrigatório' 
            });
        }
        
        // Verificar se o pedido existe
        const existingOrder = await OrderService.get(orderId);
        if (!existingOrder) {
            return res.status(404).json({ 
                success: false, 
                message: `Pedido com ID ${orderId} não encontrado` 
            });
        }
        
        // Excluir o pedido
        await OrderService.delete(orderId);
        
        res.status(200).json({ 
            success: true, 
            message: `Pedido com ID ${orderId} foi excluído com sucesso`
        });
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
    getOrders,
    getOrderById,
    addOrder,
    updateOrder,
    deleteOrder
};
