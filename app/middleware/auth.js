const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');

/**
 * Middleware para verificar JWT token
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso não fornecido'
            });
        }

        // Verificar se JWT_SECRET está definido
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET não está definido nas variáveis de ambiente');
            return res.status(500).json({
                success: false,
                message: 'Erro de configuração do servidor'
            });
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar o usuário no banco de dados
        const user = await User.findByPk(decoded.userId || decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido: usuário não encontrado'
            });
        }

        // Adicionar usuário ao request
        req.user = user;
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

/**
 * Middleware para verificar se o usuário é proprietário do seller
 */
const authorizeSellerOwner = async (req, res, next) => {
    try {
        const sellerId = req.params.seller_id || req.params.id;
        
        if (!sellerId) {
            return res.status(400).json({
                success: false,
                message: 'ID do seller é obrigatório'
            });
        }

        // Buscar o seller
        const seller = await Seller.findByPk(sellerId);
        
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller não encontrado'
            });
        }

        // Verificar se o usuário é o proprietário
        if (seller.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado: você não é o proprietário deste seller'
            });
        }

        // Adicionar seller ao request para uso posterior
        req.seller = seller;
        next();
    } catch (error) {
        console.error('Erro na autorização do seller:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

/**
 * Middleware para verificar se o usuário é admin OU proprietário do seller
 */
const authorizeAdminOrOwner = async (req, res, next) => {
    try {
        // Se for admin, pular verificação de proprietário
        if (req.user.role === 'admin') {
            return next();
        }

        // Caso contrário, usar a verificação de proprietário
        return authorizeSellerOwner(req, res, next);
    } catch (error) {
        console.error('Erro na autorização admin/owner:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

/**
 * Middleware para verificar se o usuário é admin
 */
const authorizeAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado: apenas administradores podem acessar este recurso'
            });
        }

        next();
    } catch (error) {
        console.error('Erro na autorização de admin:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    authenticateToken,
    authorizeSellerOwner,
    authorizeAdminOrOwner,
    authorizeAdmin
};
