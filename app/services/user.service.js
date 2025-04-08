const User = require('../models/User');
const UserData = require('../models/UserData');
const { formatError, createError } = require('../utils/errorHandler');
const sequelize = require('../config/database');
const { Op } = require('sequelize'); // Adicionando importação do Op

class UserService {
    async getAll(sellerId = null) {
        try {
            const whereClause = sellerId ? { seller_id: sellerId } : {};
            const users = await User.findAll({
                where: whereClause,
                include: [{ model: UserData, as: 'userData' }]
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
                return createError('ID é obrigatório', 400);
            }
            
            const user = await User.findByPk(id, {
                include: [{ model: UserData, as: 'userData' }]
            });
            console.log("Service / User: ", user);
            
            if (!user) {
                return createError(`Usuário com ID ${id} não encontrado`, 404);
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
            // Validações básicas
            if (!data.email) {
                return createError('Email é obrigatório', 400);
            }
            
            // Transação para garantir que userData e user são criados juntos
            const result = await sequelize.transaction(async (t) => {
                // Criar ou atualizar UserData
                let userData;
                if (data.userData) {
                    userData = await UserData.create({
                        cpfCnpj: data.userData.cpfCnpj,
                        email: data.email, // Sincronizar email
                        mobilePhone: data.userData.mobilePhone || null,
                        address: data.userData.address || null,
                        addressNumber: data.userData.addressNumber || null,
                        province: data.userData.province || null,
                        postalCode: data.userData.postalCode || null,
                        birthDate: data.userData.birthDate || null
                    }, { transaction: t });
                }
                
                // Criar User
                const user = await User.create({
                    username: data.username || null,
                    email: data.email,
                    password: data.password || null,
                    seller_id: data.seller_id || null,
                    user_data_id: userData ? userData.id : null
                }, { transaction: t });
                
                return { user, userData };
            });
            
            // Carregar o user com os dados relacionados
            const userWithData = await User.findByPk(result.user.id, {
                include: [{ model: UserData, as: 'userData' }]
            });
            
            console.log('User created with data:', userWithData);
            return { success: true, data: userWithData };
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.error('Erro de validação: email já existe');
                return createError('Email já existe', 400);
            }
            console.error('Erro ao criar usuário:', error.message);
            return formatError(error);
        }
    }

    async update(id, data) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const user = await User.findByPk(id, {
                include: [{ model: UserData, as: 'userData' }]
            });
            
            if (!user) {
                return createError(`Usuário com ID ${id} não encontrado`, 404);
            }
            
            // Transação para garantir atomicidade
            const result = await sequelize.transaction(async (t) => {
                // Verificamos se precisamos trabalhar com UserData
                if (data.cpfCnpj || data.mobilePhone || data.address || 
                    data.addressNumber || data.province || data.postalCode || 
                    data.birthDate) {
                    
                    // Se o usuário já tem um UserData, atualizamos
                    if (user.userData) {
                        await user.userData.update({
                            cpfCnpj: data.cpfCnpj || user.userData.cpfCnpj,
                            email: data.email || user.userData.email, // Mantendo e-mail sincronizado
                            mobilePhone: data.mobilePhone || user.userData.mobilePhone,
                            address: data.address || user.userData.address,
                            addressNumber: data.addressNumber || user.userData.addressNumber,
                            province: data.province || user.userData.province,
                            postalCode: data.postalCode || user.userData.postalCode,
                            birthDate: data.birthDate || user.userData.birthDate
                        }, { transaction: t });
                    } else {
                        // Se não tem UserData, criamos um novo
                        const userData = await UserData.create({
                            cpfCnpj: data.cpfCnpj || null,
                            email: data.email || user.email, // Usando o e-mail do usuário
                            mobilePhone: data.mobilePhone || null,
                            address: data.address || null,
                            addressNumber: data.addressNumber || null,
                            province: data.province || null,
                            postalCode: data.postalCode || null,
                            birthDate: data.birthDate || null
                        }, { transaction: t });
                        
                        // Atualiza o user_data_id no usuário
                        user.user_data_id = userData.id;
                    }
                }
                
                // Atualizar dados básicos do usuário
                await user.update({
                    username: data.username !== undefined ? data.username : user.username,
                    email: data.email !== undefined ? data.email : user.email,
                    password: data.password !== undefined ? data.password : user.password,
                    user_data_id: user.user_data_id // Mantém o user_data_id atualizado
                }, { transaction: t });
                
                return user;
            });
            
            // Recarregar o usuário com os dados atualizados
            await result.reload({ include: [{ model: UserData, as: 'userData' }] });
            
            console.log('User updated:', result.id);
            return { success: true, data: result };
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                console.error('Erro de validação: email já existe');
                return createError('Email já existe', 400);
            }
            console.error('Erro ao atualizar usuário:', error.message);
            return formatError(error);
        }
    }

    async delete(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const user = await User.findByPk(id, {
                include: [{ model: UserData, as: 'userData' }]
            });
            
            if (!user) {
                return createError(`Usuário com ID ${id} não encontrado`, 404);
            }
            
            // Transação para garantir atomicidade
            await sequelize.transaction(async (t) => {
                // Remover userData se existir e não estiver sendo usado por outro usuário
                if (user.userData) {
                    const otherUsers = await User.count({
                        where: { 
                            user_data_id: user.userData.id,
                            id: { [Op.ne]: id } // Usando Op importado corretamente
                        }
                    });
                    
                    if (otherUsers === 0) {
                        await user.userData.destroy({ transaction: t });
                    }
                }
                
                // Remover o usuário
                await user.destroy({ transaction: t });
            });
            
            console.log(`Usuário com ID ${id} foi excluído com sucesso`);
            return { success: true, message: `Usuário com ID ${id} foi excluído com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir usuário:', error.message);
            return formatError(error);
        }
    }

    // Método auxiliar para buscar usuário por email ou CPF/CNPJ
    async findByEmailOrCpfCnpj(email, cpfCnpj) {
        try {
            let user = null;
            
            if (email) {
                // Buscar por email
                user = await User.findOne({
                    where: { email },
                    include: [{ model: UserData, as: 'userData' }]
                });
            }
            
            if (!user && cpfCnpj) {
                // Buscar por cpfCnpj através do userData
                const userData = await UserData.findOne({
                    where: { cpfCnpj },
                    include: [{ model: User, as: 'user' }]
                });
                
                if (userData && userData.user) {
                    user = await User.findByPk(userData.user.id, {
                        include: [{ model: UserData, as: 'userData' }]
                    });
                }
            }
            
            return { success: true, data: user };
        } catch (error) {
            console.error('Erro ao buscar usuário por email ou CPF/CNPJ:', error.message);
            return formatError(error);
        }
    }
}

module.exports = new UserService();
