require('dotenv').config();
const axios = require('axios');
const Seller = require('../models/Seller');

const getSellers = async (req,res) => {
    console.log("Controller - AppSellersController/getSellers");
    const getSeller = await Seller.get();
        console.log("getSeller",getSeller);
    
        res.status(200).json(getSeller);
}
const getSellerById = async (req,res) => {
    console.log("Controller - AppSellersController/getSellerById");
    const getSeller = await Seller.get(req.params.id);
        console.log("getSeller",getSeller);
    
        res.status(200).json(getSeller);
}

const getSellerSubscriptions = async (req,res) => {
    res.status(200).json({message:"getSellerSubscriptions: "+req.params.id});
}
const addSellerSubscription = async (req,res) => {
    res.status(200).json({message:"addSellerSubscription"});
}

const addSeller = (req,res) => {
    console.log("Controller - AppSellersController/addSeller");

    const createSeller = Seller.create(req.body);
    console.log("createSeller",createSeller);

    res.status(200).json({ message: 'Controller - AppSellersController/addSeller' });
}

module.exports = {
    getSellers,
    getSellerById,
    getSellerSubscriptions,
    addSellerSubscription,
    addSeller
};