require('dotenv').config();
const OrderService = require('../services/OrderService');

const getOrders = (req,res) => {
    console.log("Controller - AppOrdersController/getOrders");
    res.status(200).json({ message: 'Controller - AppOrdersController/getOrders' });
}

const getOrderById = (req,res) => {
    console.log("Controller - AppOrdersController/getOrderById");
    res.status(200).json({ message: 'Controller - AppOrdersController/getOrderById' });
}

const addOrder = async (req,res) => {
    try {
        console.log("Controller - AppOrdersController/addOrders");
        const createdOrder = await OrderService.create(req.body);
        res.status(201).json({ message: 'Pedido criado com sucesso', order: createdOrder });
    } catch (error) {
        console.error("Erro ao criar pedido:", error);
        res.status(500).json({ error: 'Erro ao criar pedido' });
    }
}

module.exports = {
    getOrders,
    getOrderById,
    addOrder
}
