require('dotenv').config();
const UserService = require('../services/user.service');
const { formatError } = require('../utils/errorHandler');

const index = async (req, res) => {
    console.log("Controller - AppUsersController/index");
    try {
        const sellerId = req.query.seller_id;
        const users = await UserService.getAll(sellerId);
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error.message);
        res.status(500).json({ error: 'Falha ao buscar usuários' });
    }
};

const show = async (req, res) => {
    console.log("Controller - AppUsersController/show");
    try {
        const user = await UserService.get(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error.message);
        res.status(500).json({ error: 'Falha ao buscar usuário' });
    }
};

const store = async (req, res) => {
    console.log("Controller - AppUsersController/store");
    try {
        const user = await UserService.create(req.body);
        res.status(201).json({ 
            success: true,
            message: 'Usuário criado com sucesso', 
            data: user 
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error.message);
        res.status(500).json({
            success: false, 
            message: 'Falha ao criar usuário',
            error: error.message
        });
    }
};

const update = async (req, res) => {
    console.log("Controller - AppUsersController/update");
    try {
        const userId = req.params.id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do usuário é obrigatório' 
            });
        }
        
        const result = await UserService.update(userId, req.body);
        
        if (!result.success) {
            return res.status(result.status || 400).json({
                success: false,
                message: result.message,
                errors: result.errors
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Usuário atualizado com sucesso', 
            data: result.data 
        });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error.message);
        return res.status(500).json(formatError(error));
    }
};

const destroy = async (req, res) => {
    console.log("Controller - AppUsersController/destroy");
    try {
        const userId = req.params.id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do usuário é obrigatório' 
            });
        }
        
        // Verificar se o usuário existe
        const existingUser = await UserService.get(userId);
        if (!existingUser) {
            return res.status(404).json({ 
                success: false, 
                message: `Usuário com ID ${userId} não encontrado` 
            });
        }
        
        // Excluir o usuário
        await UserService.delete(userId);
        
        res.status(200).json({ 
            success: true, 
            message: `Usuário com ID ${userId} foi excluído com sucesso`
        });
    } catch (error) {
        console.error("Erro ao excluir usuário:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir usuário', 
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