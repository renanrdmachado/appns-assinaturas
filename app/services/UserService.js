const User = require('../models/User');

class UserService {
    async get(id = null) {
        try {
            if (id) {
                const user = await User.findOne({
                    where: { id: id },
                });
                console.log("Service / User: ", user);
                return user;
            } else {
                const users = await User.findAll();
                console.log("Service / User: ", users);
                return users;
            }
        } catch (error) {
            console.error('Erro ao buscar usuário(s):', error.message);
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
}

module.exports = new UserService();
