const User = require('../models/User');
const { formatError } = require('../utils/errorHandler');

class UserService {
    async getAll(sellerId = null) {
        try {
            const whereClause = sellerId ? { seller_id: sellerId } : {};
            const users = await User.findAll({
                where: whereClause
            });
            
            console.log("Service / All Users count: ", users.length);
            return { success: true, data: users };
        } catch (error) {
            console.error('Erro ao buscar usuários:', error.message);
            return formatError(error);
        }
    }

    async get(id) {
        try {
            if (!id) {
                return { success: false, message: 'ID é obrigatório', status: 400 };
            }
            
            const user = await User.findByPk(id);
            console.log("Service / User: ", user);
            
            if (!user) {
                return { success: false, message: `Usuário com ID ${id} não encontrado`, status: 404 };
            }
            
            return { success: true, data: user };
        } catch (error) {
            console.error('Erro ao buscar usuário:', error.message);
            return formatError(error);
        }
    }

    async create(data) {
        console.log('User - creating...');
        try {
            const user = await User.create({
                username: data.username,
                email: data.email,
                password: data.password,
                seller_id: data.seller_id
            });
            
            console.log('User created:', user.dataValues);
            return { success: true, data: user.dataValues };
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.error('Erro de validação: email já existe');
                return formatError(new Error('Email já existe'));
            }
            console.error('Erro ao criar usuário:', error.message);
            return formatError(error);
        }
    }

    async update(id, data) {
        try {
            const user = await User.findByPk(id);
            
            if (!user) {
                return { success: false, message: `Usuário com ID ${id} não encontrado`, status: 404 };
            }
            
            await user.update({
                username: data.username,
                email: data.email,
                password: data.password,
                seller_id: data.seller_id
            });
            
            console.log('User updated:', user.dataValues);
            return { success: true, data: user.dataValues };
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error.message);
            return formatError(error);
        }
    }

    async delete(id) {
        try {
            const user = await User.findByPk(id);
            
            if (!user) {
                return { success: false, message: `Usuário com ID ${id} não encontrado`, status: 404 };
            }
            
            await user.destroy();
            console.log(`Usuário com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Usuário com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir usuário:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new UserService();
