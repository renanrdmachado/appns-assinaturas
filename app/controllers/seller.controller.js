require('dotenv').config();
const SellerService = require('../services/seller.service');

// Listar todos os vendedores
const index = async (req, res) => {
    console.log("Controller - SellerController/index");
    try {
        // Adapte esta chamada para seu serviço
        const sellers = await SellerService.getAll();
        res.status(200).json(sellers);
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error.message);
        res.status(500).json({ error: 'Falha ao buscar vendedores' });
    }
};

// Obter um vendedor específico
const show = async (req, res) => {
    console.log("Controller - SellerController/show");
    try {
        // Adapte esta chamada para seu serviço
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

// Criar um novo vendedor
const store = async (req, res) => {
    console.log("Controller - SellerController/store");
    try {
        // Adapte esta chamada para seu serviço
        const seller = await SellerService.create(req.body);
        res.status(201).json({ 
            success: true,
            message: 'Vendedor criado com sucesso', 
            data: seller 
        });
    } catch (error) {
        console.error('Erro ao criar vendedor:', error.message);
        res.status(500).json({
            success: false, 
            message: 'Falha ao criar vendedor',
            error: error.message
        });
    }
};

// Atualizar um vendedor existente
const update = async (req, res) => {
    console.log("Controller - SellerController/update");
    try {
        // Adapte esta chamada para seu serviço
        const updatedSeller = await SellerService.update(req.params.id, req.body);
        res.status(200).json({ 
            success: true, 
            message: 'Vendedor atualizado com sucesso', 
            data: updatedSeller 
        });
    } catch (error) {
        console.error("Erro ao atualizar vendedor:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar vendedor', 
            error: error.message
        });
    }
};

// Excluir um vendedor
const destroy = async (req, res) => {
    console.log("Controller - SellerController/destroy");
    try {
        // Adapte esta chamada para seu serviço
        await SellerService.delete(req.params.id);
        res.status(200).json({ 
            success: true, 
            message: `Vendedor excluído com sucesso`
        });
    } catch (error) {
        console.error("Erro ao excluir vendedor:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir vendedor', 
            error: error.message
        });
    }
};

// Adicionar subconta a um vendedor
const addSubAccount = async (req, res) => {
    console.log("Controller - SellerController/addSubAccount");
    try {
        // Adapte esta chamada para seu serviço
        const subAccount = await SellerService.addSubAccount(req.params.id, req.body);
        res.status(201).json({ 
            success: true,
            message: 'Subconta adicionada com sucesso', 
            data: subAccount 
        });
    } catch (error) {
        console.error('Erro ao adicionar subconta:', error.message);
        res.status(500).json({
            success: false, 
            message: 'Falha ao adicionar subconta',
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
    addSubAccount
};