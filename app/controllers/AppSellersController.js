require('dotenv').config();
const SellerService = require('../services/SellerService');

const getSellers = async (req, res) => {
    console.log("Controller - AppSellersController/getSellers");
    try {
        const sellers = await SellerService.get();
        res.status(200).json(sellers);
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error.message);
        res.status(500).json({ error: 'Falha ao buscar vendedores' });
    }
};

const getSellerById = async (req, res) => {
    console.log("Controller - AppSellersController/getSellerById");
    try {
        const seller = await SellerService.get(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: 'Vendedor não encontrado' });
        }
        res.status(200).json(seller);
    } catch (error) {
        console.error('Erro ao buscar vendedor:', error.message);
        res.status(500).json({ error: 'Falha ao buscar vendedor' });
    }
};

const getSellerSubscriptions = async (req, res) => {
    res.status(200).json({message: "getSellerSubscriptions: " + req.params.id});
};

const addSellerSubscription = async (req, res) => {
    res.status(200).json({message: "addSellerSubscription"});
};

const addSeller = async (req, res) => {
    console.log("Controller - AppSellersController/addSeller");
    try {
        if (!req.body.nuvemshop_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'O campo nuvemshop_id é obrigatório' 
            });
        }
        
        const seller = await SellerService.create(req.body);
        
        res.status(201).json({ 
            success: true, 
            message: 'Vendedor criado com sucesso', 
            data: seller 
        });
    } catch (error) {
        console.error("Erro ao criar vendedor:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar vendedor', 
            error: error.message
        });
    }
};

module.exports = {
    getSellers,
    getSellerById,
    getSellerSubscriptions,
    addSellerSubscription,
    addSeller
};