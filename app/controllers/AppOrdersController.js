require('dotenv').config();
const axios = require('axios');

const getOrders = (req,res) => {
    console.log("Controller - AppOrdersController/getOrders");
    res.status(200).json({ message: 'Controller - AppOrdersController/getOrders' });
}
const getOrderById = (req,res) => {
    console.log("Controller - AppOrdersController/getOrderById");
    res.status(200).json({ message: 'Controller - AppOrdersController/getOrderById' });
}
const addOrder = (req,res) => {
    console.log("Controller - AppOrdersController/addOrders");

    const Order = require('../models/Order');
    const createOrder = Order.create(req.body);
    console.log("createOrder",createOrder);
    
    res.status(200).json({ message: 'Controller - AppOrdersController/addOrders' });
}

module.exports = {
    getOrders,
    getOrderById,
    addOrder
}
