const User = require('../models/User');

class UserService {
    async get(id) {
        try {
            if (!id) {
                return null;
            }
            
            const user = await User.findByPk(id);
            console.log("Service / User: ", user);
            return user;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error.message);
            throw error;
        }
    }
    
    async getAll(sellerId = null) {
        try {
            const whereClause = sellerId ? { seller_id: sellerId } : {};
            const users = await User.findAll({
                where: whereClause
            });
            
            console.log("Service / All Users count: ", users.length);
            return users;
        } catch (error) {
            console.error('Erro ao buscar usuários:', error.message);
            throw error;
        }
    }

    async create(data) {
        console.log('User - creating...');
        try {
            const [user, created] = await User.upsert({
                username: data.username,
                email: data.email,
                password: data.password,
                seller_id: data.seller_id
            });
            
            console.log('User created:', user.dataValues);
            return user.dataValues;
        } catch (error) {
            console.error('Erro ao criar usuário:', error.message);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const user = await User.findByPk(id);
            
            if (!user) {
                throw new Error(`Usuário com ID ${id} não encontrado`);
            }
            
            await user.update({
                username: data.username,
                email: data.email,
                password: data.password,
                seller_id: data.seller_id
            });
            
            console.log('User updated:', user.dataValues);
            return user.dataValues;
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error.message);
            throw error;
        }
    }
    
    async delete(id) {
        try {
            const user = await User.findByPk(id);
            
            if (!user) {
                throw new Error(`Usuário com ID ${id} não encontrado`);
            }
            
            await user.destroy();
            console.log(`Usuário com ID ${id} foi excluído com sucesso`);
            return true;
        } catch (error) {
            console.error('Erro ao excluir usuário:', error.message);
            throw error;
        }
    }
}

module.exports = new UserService();
