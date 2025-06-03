require('dotenv').config();
const SellerService = require('../services/seller.service');
const PaymentMethodsValidator = require('../validators/payment-methods-validator');
const { formatError } = require('../utils/errorHandler');

// Listar todos os vendedores
const index = async (req, res) => {
    console.log("Controller - SellerController/index");
    try {
        const result = await SellerService.getAll();
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Erro ao buscar vendedores:', error);
        return res.status(500).json(formatError(error));
    }
};

// Obter um vendedor específico
const show = async (req, res) => {
    console.log("Controller - SellerController/show");
    try {
        const result = await SellerService.get(req.params.id);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Erro ao buscar vendedor:', error);
        return res.status(500).json(formatError(error));
    }
};

// Criar um novo vendedor
const store = async (req, res) => {
    console.log("Controller - SellerController/store");
    try {
        const result = await SellerService.create(req.body);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(201).json({ 
            success: true,
            message: 'Vendedor criado com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error('Erro ao criar vendedor:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar vendedor',
            error: error.message
        });
    }
};

// Atualizar um vendedor existente
const update = async (req, res) => {
    console.log("Controller - SellerController/update");
    try {
        const result = await SellerService.update(req.params.id, req.body);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Vendedor atualizado com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao atualizar vendedor:", error);
        return res.status(500).json(formatError(error));
    }
};

// Excluir um vendedor
const destroy = async (req, res) => {
    console.log("Controller - SellerController/destroy");
    try {
        const result = await SellerService.delete(req.params.id);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Vendedor excluído com sucesso`
        });
    } catch (error) {
        console.error("Erro ao excluir vendedor:", error);
        return res.status(500).json(formatError(error));
    }
};

// Adicionar subconta a um vendedor
const addSubAccount = async (req, res) => {
    console.log("Controller - SellerController/addSubAccount");
    try {
        const result = await SellerService.addSubAccount(req.params.id, req.body);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(201).json({ 
            success: true,
            message: 'Subconta adicionada com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error('Erro ao adicionar subconta:', error);
        return res.status(500).json(formatError(error));
    }
};

// Sincronizar vendedor com o Asaas
const syncWithAsaas = async (req, res) => {
    console.log("Controller - SellerController/syncWithAsaas");
    try {
        const { id } = req.params;
        const result = await SellerService.syncWithAsaas(id);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({
            success: true,
            message: 'Vendedor sincronizado com sucesso no Asaas',
            data: result.data
        });
    } catch (error) {
        console.error("Erro ao sincronizar vendedor com Asaas:", error);
        return res.status(500).json(formatError(error));
    }
};

// Atualizar métodos de pagamento aceitos pelo seller
const updatePaymentMethods = async (req, res) => {
    console.log("Controller - SellerController/updatePaymentMethods");
    try {
        const { id } = req.params;
        const { payment_methods } = req.body;
        
        const result = await SellerService.updatePaymentMethods(id, payment_methods);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Métodos de pagamento atualizados com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao atualizar métodos de pagamento:", error);
        return res.status(500).json(formatError(error));
    }
};

// Adicionar método de pagamento aos aceitos pelo seller
const addPaymentMethod = async (req, res) => {
    console.log("Controller - SellerController/addPaymentMethod");
    try {
        const { id } = req.params;
        const { payment_method } = req.body;
        
        const result = await SellerService.addPaymentMethod(id, payment_method);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Método de pagamento '${payment_method}' adicionado com sucesso`, 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao adicionar método de pagamento:", error);
        return res.status(500).json(formatError(error));
    }
};

// Remover método de pagamento dos aceitos pelo seller
const removePaymentMethod = async (req, res) => {
    console.log("Controller - SellerController/removePaymentMethod");
    try {
        const { id } = req.params;
        const { payment_method } = req.body;
        
        const result = await SellerService.removePaymentMethod(id, payment_method);
        
        // Verificar se a operação foi bem-sucedida
        if (!result.success) {
            return res.status(result.status || 400).json(result);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Método de pagamento '${payment_method}' removido com sucesso`, 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao remover método de pagamento:", error);
        return res.status(500).json(formatError(error));
    }
};

module.exports = {
    index,
    show,
    store,
    update,
    destroy,
    addSubAccount,
    syncWithAsaas,
    updatePaymentMethods,
    addPaymentMethod,
    removePaymentMethod
};