require('dotenv').config();
const UserService = require('../services/user.service');

const getUsers = async (req, res) => {
    console.log("Controller - AppUsersController/getUsers");
    try {
        const sellerId = req.query.seller_id;
        const users = await UserService.getAll(sellerId);
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error.message);
        res.status(500).json({ error: 'Falha ao buscar usuários' });
    }
};

const getUserById = async (req, res) => {
    console.log("Controller - AppUsersController/getUserById");
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

const addUser = async (req, res) => {
    console.log("Controller - AppUsersController/addUser");
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

const updateUser = async (req, res) => {
    console.log("Controller - AppUsersController/updateUser");
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
        
        // Atualizar o usuário
        const updatedUser = await UserService.update(userId, req.body);
        
        res.status(200).json({ 
            success: true, 
            message: 'Usuário atualizado com sucesso', 
            data: updatedUser 
        });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar usuário', 
            error: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    console.log("Controller - AppUsersController/deleteUser");
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
    getUsers,
    getUserById,
    addUser,
    updateUser,
    deleteUser
};