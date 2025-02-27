require('dotenv').config();
const UserService = require('../services/UserService');

const getUsers = async (req, res) => {
    console.log("Controller - AppUsersController/getUsers");
    try {
        const users = await UserService.get();
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
            message: 'Usuário criado com sucesso', 
            user: user 
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error.message);
        res.status(500).json({ error: 'Falha ao criar usuário' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    addUser
};