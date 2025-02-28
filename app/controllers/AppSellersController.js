require('dotenv').config();
const SellerService = require('../services/SellerService');

const getSellers = async (req, res) => {
    console.log("Controller - AppSellersController/getSellers");
    try {
        const sellers = await SellerService.getAll();
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
    console.log("Controller - AppSellersController/getSellerSubscriptions");
    try {
        const seller = await SellerService.get(req.params.id);
        if (!seller) {
            return res.status(404).json({ 
                success: false, 
                message: 'Vendedor não encontrado' 
            });
        }
        
        // Retorna as informações de assinatura do vendedor
        const subscriptionInfo = {
            subscription_id: seller.payments_subscription_id,
            customer_id: seller.payments_customer_id,
            next_due: seller.payments_next_due,
            status: seller.payments_status,
            app_status: seller.app_status
        };
        
        res.status(200).json({ 
            success: true, 
            data: subscriptionInfo 
        });
    } catch (error) {
        console.error('Erro ao buscar assinaturas do vendedor:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao buscar assinaturas do vendedor',
            error: error.message
        });
    }
};

const addSellerSubscription = async (req, res) => {
    console.log("Controller - AppSellersController/addSellerSubscription");
    try {
        const sellerId = req.params.id;
        const paymentInfo = req.body;
        
        if (!sellerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do vendedor é obrigatório' 
            });
        }
        
        // Verificar se o vendedor existe
        const existingSeller = await SellerService.get(sellerId);
        if (!existingSeller) {
            return res.status(404).json({ 
                success: false, 
                message: `Vendedor com ID ${sellerId} não encontrado` 
            });
        }
        
        // Salvar informações de pagamento
        const updatedSeller = await SellerService.savePaymentsInfo(sellerId, paymentInfo);
        
        res.status(200).json({ 
            success: true, 
            message: 'Informações de assinatura atualizadas com sucesso', 
            data: updatedSeller 
        });
    } catch (error) {
        console.error('Erro ao adicionar assinatura do vendedor:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao adicionar assinatura do vendedor',
            error: error.message
        });
    }
};

const addSellerSubAccount = async (req, res) => {
    console.log("Controller - AppSellersController/addSellerSubAccount");
    try {
        const sellerId = req.params.id;
        const accountInfo = req.body;
        
        if (!sellerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do vendedor é obrigatório' 
            });
        }
        
        // Verificar se o vendedor existe
        const existingSeller = await SellerService.get(sellerId);
        if (!existingSeller) {
            return res.status(404).json({ 
                success: false, 
                message: `Vendedor com ID ${sellerId} não encontrado` 
            });
        }
        
        // Salvar informações da subconta
        const updatedSeller = await SellerService.saveSubAccountInfo(sellerId, accountInfo);
        
        res.status(200).json({ 
            success: true, 
            message: 'Informações da subconta atualizadas com sucesso', 
            data: updatedSeller 
        });
    } catch (error) {
        console.error('Erro ao adicionar subconta do vendedor:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Falha ao adicionar subconta do vendedor',
            error: error.message
        });
    }
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

const updateSeller = async (req, res) => {
    console.log("Controller - AppSellersController/updateSeller");
    try {
        const sellerId = req.params.id;
        
        if (!sellerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do vendedor é obrigatório' 
            });
        }
        
        // Verificar se o vendedor existe
        const existingSeller = await SellerService.get(sellerId);
        if (!existingSeller) {
            return res.status(404).json({ 
                success: false, 
                message: `Vendedor com ID ${sellerId} não encontrado` 
            });
        }
        
        // Atualizar o vendedor
        const updatedSeller = await SellerService.update(sellerId, req.body);
        
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

const deleteSeller = async (req, res) => {
    console.log("Controller - AppSellersController/deleteSeller");
    try {
        const sellerId = req.params.id;
        
        if (!sellerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do vendedor é obrigatório' 
            });
        }
        
        // Verificar se o vendedor existe
        const existingSeller = await SellerService.get(sellerId);
        if (!existingSeller) {
            return res.status(404).json({ 
                success: false, 
                message: `Vendedor com ID ${sellerId} não encontrado` 
            });
        }
        
        // Excluir o vendedor
        await SellerService.delete(sellerId);
        
        res.status(200).json({ 
            success: true, 
            message: `Vendedor com ID ${sellerId} foi excluído com sucesso`
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

module.exports = {
    getSellers,
    getSellerById,
    getSellerSubscriptions,
    addSellerSubscription,
    addSeller,
    updateSeller,
    deleteSeller,
    addSellerSubAccount
};