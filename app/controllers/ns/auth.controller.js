require('dotenv').config();
const NsService = require('../../services/ns.service');
const { formatError, createError } = require('../../utils/errorHandler');

class NsAuthController {
    // Instalação e autorização do app
    async authorize(req, res) {
        try {
            const { code } = req.query;
            
            if (!code) {
                return res.status(400).json(createError('Código de autorização é obrigatório', 400));
            }
            
            const result = await NsService.authorize(code);
            
            if (!result.success) {
                return res.status(result.status || 400).json(result);
            }
            
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro no controlador de autorização NS:', error);
            return res.status(500).json(formatError(error)); 
        }
    }
}

module.exports = new NsAuthController();
